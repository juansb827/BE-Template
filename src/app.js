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
                attributes: [],
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
    if (!job) {
        await t.rollback();
        return res.status(404).end()
    }

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


/**
 * Transfer balance between clients
 */
app.post('/balances/deposit/:userId', getProfile, async (req, res) => {
    const { Job, Contract, Profile } = req.app.get('models')
    const { userId: destinationProfileId } = req.params
    const { id: sourceProfileId } = req.profile;
    const { amount } = req.body;

    const t = await sequelize.transaction();

    const sourceClient = await Profile.findOne({ where: { id: sourceProfileId }, transaction: t })
    const destinationClient = await Profile.findOne({ where: { id: destinationProfileId }, transaction: t })

    if (!destinationClient) {
        await t.rollback();
        return res.status(404).end()
    }

    const sourceBalance = sourceClient.balance;
    const destinationBalance = destinationClient.balance;

    const totalJobsToPay = await Job.sum('price', {
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
                        { ClientId: sourceProfileId },
                    ]
                }
            }
        ],
        raw: true,
        transaction: t
    })

    // validations
    let message;

    if (Number(sourceProfileId) === Number(destinationProfileId)) {
        message = message || 'User cannot deposit itself'
    }

    if (sourceClient.type !== 'client' || destinationClient.type !== 'client') {
        message = message || 'Only clients can send/receive deposit'
    }

    if (amount > totalJobsToPay * 0.25) {
        message = message || 'Deposit cannot be above 25% of total of jobs to pay'
    }

    if (amount > sourceBalance) {
        message = message || 'Not enough balance'
    }

    if (message) {
        t.rollback();
        return res.status(400).send({
            message
        })
    }

    // balance update   
    const newSourceBalance = sourceBalance - amount
    const newDestinationBalance = destinationBalance + amount

    sourceClient.set({
        balance: newSourceBalance
    })
    await sourceClient.save({ transaction: t })

    destinationClient.set({
        balance: newDestinationBalance
    })
    await destinationClient.save({ transaction: t })

    await t.commit();
    return res.status(200).end()

});

/**
 * @returns - best payed profession within a time range
 */
app.get('/admin/best-profession', getProfile, async (req, res) => {
    const { Profile, Contract, Job } = req.app.get('models')

    // expects yyyy-MM-dd
    const { start, end } = req.query;

    const startDate = new Date(Date.parse(start));
    const endDate = new Date(Date.parse(end));



    if (isNaN(startDate) || isNaN(endDate)) {
        return res.status(400).send({
            message: 'Invalid date range'
        })
    }

    // TODO: useFindOne
    const bestProfession = await Profile.findAll({
        attributes: ['profession', [sequelize.fn('sum', sequelize.col('price')), 'total_earnings']],
        where: {
            type: 'contractor'
        },
        include: [
            {
                model: Contract,
                as: 'Contractor',
                attributes: [],
                include: {
                    model: Job,
                    attributes: ['price'],
                    where: {
                        paymentDate: {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                }
            }
        ],
        raw: true,
        group: ['Profile.profession'],
        order: [[sequelize.col('total_earnings'), 'DESC']],
    })

    if (!bestProfession || !bestProfession.length) return res.json([])
    const { profession, total_earnings } = bestProfession[0];

    return res.json({
        profession,
        total_earnings: total_earnings || 0
    })
})

/**
 * @returns - clients that have paid the most on jobs
 */
app.get('/admin/best-clients', getProfile, async (req, res) => {
    const { Profile, Contract, Job } = req.app.get('models')

    // expects yyyy-MM-dd
    const { start, end } = req.query;

    const startDate = new Date(Date.parse(start));
    const endDate = new Date(Date.parse(end));
    let limit = req.query.limit || 2;



    if (isNaN(startDate) || isNaN(endDate)) {
        return res.status(400).send({
            message: 'Invalid date range'
        })
    }

    // TODO: use SQL limit
    let bestClient = await Profile.findAll({
        attributes: ['id', 'firstName', 'lastName', [sequelize.fn('sum', sequelize.col('price')), 'paid']],
        where: {
            type: 'client'
        },
        include: [
            {
                model: Contract,
                as: 'Client',
                attributes: [],
                include: {
                    model: Job,
                    attributes: ['price'],
                    where: {
                        paymentDate: {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                }
            }
        ],
        raw: true,
        group: ['Profile.profession'],
        order: [[sequelize.col('paid'), 'DESC']],
    })

    if (!bestClient || !bestClient.length) return res.json([])
    bestClient = bestClient.slice(0, limit);
    const ans = bestClient.map(({ id, paid, firstName, lastName }) => ({
        id,
        paid: paid || 0,
        fullName: `${firstName} ${lastName}`
    }));
    return res.json(ans)
})

module.exports = app;


