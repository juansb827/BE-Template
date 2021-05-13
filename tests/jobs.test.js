const supertest = require('supertest')
const app = require('../src/app');

describe('Jobs', () => {
    let request;

    beforeEach(() => {
        request = supertest.agent(app).set({ 'profile_id': '2' })
    })


    beforeAll(async () => {
        await require('../scripts/seedDb.js')
    })

    describe('GET /jobs/unpaid', () => {

        it('should get all unpaid jobs for a user', async () => {
            const res = await request
                .get('/jobs/unpaid')
                .send()

            expect(res.statusCode).toEqual(200)
            expect(res.body).toMatchObject(
                [
                    {
                        "id": 3,
                        "description": "work",
                        "price": 202,
                        "paid": null,
                        "paymentDate": null,
                        "ContractId": 3
                    },
                    {
                        "id": 4,
                        "description": "work",
                        "price": 200,
                        "paid": null,
                        "paymentDate": null,
                        "ContractId": 4
                    }
                ]
            )
        })

    })

    describe('GET /jobs/:job_id/pay', () => {

        describe('when the job does not exist', () => {

            it('should return 404 status code', async () => {
                const res = await request
                    .post('/jobs/0/pay')
                    .send()
                expect(res.statusCode).toEqual(404)
            })
        })
        describe('when the job is not associated with the client', () => {

            it('should return 404 status code', async () => {
                const res = await request
                    .post('/jobs/9/pay')
                    .send()
                expect(res.statusCode).toEqual(404)
            })
        })

        describe('when the job is already paid', () => {
            it('should return 400 status code and a error message', async () => {
                const res = await request
                    .post('/jobs/14/pay')
                    .send()

                expect(res.statusCode).toEqual(400)
                expect(res.body).toEqual({
                    message: 'Job is already paid'
                });
            })
        })
        describe('when the contract is not active', () => {
            it('should return 400 status code and a error message', async () => {
                const res = await request
                    .post('/jobs/1/pay')
                    .set('profile_id', '1')
                    .send()

                expect(res.statusCode).toEqual(400)
                expect(res.body).toEqual({
                    message: 'Contract is not active'
                });
            })
        })

        it('should be able to pay for the job', async () => {
            const res = await request
                .post('/jobs/4/pay')
                .set('profile_id', '2')
                .send()

            expect(res.statusCode).toEqual(200)
        })

    })
})