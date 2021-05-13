const supertest = require('supertest')
const app = require('../src/app');

describe('Jobs', () => {
    let request;

    beforeEach(() => {
        request = supertest.agent(app).set({ 'profile_id': '1' })
    })

    beforeAll(async () => {
        await require('../scripts/seedDb.js')
    })

    describe('GET /jobs/unpaid', () => {

        describe('when contract does NOT exist', () => {

            it('should return 404 status code', async () => {
                const res = await request
                    .get('/contracts/0')
                    .send()
                expect(res.statusCode).toEqual(404)
            })
        })

        describe('when contract exists but does not belong to the user', () => {

            it('should return 404 status code', async () => {
                const res = await request
                    .get('/contracts/9')
                    .send()
                expect(res.statusCode).toEqual(404)
            })
        })

        describe('when contract exists', () => {

            it('should return the contract', async () => {
                const res = await request
                    .get('/contracts/2')
                    .send()

                expect(res.statusCode).toEqual(200)
                expect(res.body).toMatchObject(
                    {
                        "id": 2,
                        "terms": "bla bla bla",
                        "status": "in_progress",
                        "ContractorId": 6,
                        "ClientId": 1
                    }
                )
            })
        })
    })

    describe('GET /contracts', () => {

        it('should return contracts that belong to the user', async () => {
            const res = await request
                .get('/contracts')
                .send()
            expect(res.statusCode).toEqual(200)
            expect(res.body).toMatchObject(
                [
                    {
                        "id": 2,
                        "terms": "bla bla bla",
                        "status": "in_progress",
                        "ContractorId": 6,
                        "ClientId": 1
                    }
                ]
            )
        })

    })
})