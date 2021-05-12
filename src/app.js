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
    const { id: profileId} = req.profile;

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
 * @returns all contracts from a profile
 */
app.get('/contracts', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id: profileId} = req.profile;

    const contracts = await Contract.findAll({
        where: {
            status: {  [Op.not]: 'terminated' },
            [Op.or]: [
                { ClientId: profileId },
                { ContractorId: profileId },
            ]
        }
    })

    if (!contracts) return res.status(404).end()
    res.json(contracts)
})

module.exports = app;
