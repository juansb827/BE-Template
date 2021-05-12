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

module.exports = app;
