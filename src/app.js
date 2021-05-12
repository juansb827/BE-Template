const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model')
const { getProfile } = require('./middleware/getProfile')
const app = express();
const { Op } = require("sequelize");

app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id } = req.params
    const { id: profileId } = req.profile;

    const contract = await Contract.findOne({
        where: {
            id,
            [Op.or]: [
                { ClientId: profileId },
                { ContractorId: profileId },
            ]
        }
    })

    if (!contract) return res.status(404).end()
    res.json(contract)
})


/**
 * @returns all contracts
 */
app.get('/contracts', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id: profileId } = req.profile;

    const contracts = await Contract.findAll({
        where: {
            status: { [Op.not]: 'terminated' },
            [Op.or]: [
                { ClientId: profileId },
                { ContractorId: profileId },
            ]
        }
    })

    res.json(contracts)
})

/**
 * @returns all unpaid jobs whose contract is still active
 */
app.get('/jobs/unpaid', getProfile, async (req, res) => {
    const { Job, Contract } = req.app.get('models')
    const { id: profileId } = req.profile;

    const jobs = await Job.findAll({
        where: {
            paid: { [Op.not]: true },
        },
        include: [
            {
                model: Contract,
                required: true,
                where: {
                    status: 'in_progress',
                    [Op.or]: [
                        { ClientId: profileId },
                        { ContractorId: profileId },
                    ]
                }
            }
        ]
    })

    res.json(jobs)
})



/**
 * Pay for a job 
 */
app.post('/jobs/:id/pay', getProfile, async (req, res) => {
    const { Job, Contract, Profile } = req.app.get('models')
    const { id } = req.params
    const { id: profileId } = req.profile;
    const t = await sequelize.transaction();
    const job = await Job.findOne({
        where: {
            id
        },
        include: [
            {
                model: Contract,
                required: true,
                where: {
                    [Op.or]: [
                        { ClientId: profileId },
                    ]
                }
            }
        ],
        transaction: t
    })
    if (!job) return res.status(404).end()

    const client = await Profile.findOne({ where: { id: profileId }, transaction: t })
    const contractorId = job.Contract.ContractorId;
    const contractor = await Profile.findOne({ where: { id: contractorId }, transaction: t })

    const clientBalance = client.balance;
    const contractorBalance = contractor.balance;

    // validations
    let message;
    if (job.paid) {
        message = message || 'Job is already paid'
    }

    if (job.Contract.status !== 'in_progress') {
        message = message || 'Contract is not active'
    }

    if (clientBalance < job.price) {
        message = message || 'Balance is not enough to pay for the job'
    }

    if (message) {
        t.rollback();
        return res.status(400).send({
            message
        })
    }

    // balance update   
    const newClientBalance = clientBalance - job.price
    const newContractorBalance = contractorBalance + job.price

    client.set({
        balance: newClientBalance
    })
    await client.save({ transaction: t })

    contractor.set({
        balance: newContractorBalance
    })
    await contractor.save({ transaction: t })

    job.set({ paid: true })
    await job.save({ transaction: t })

    await t.commit();
    return res.status(200).end()
});

module.exports = app;
