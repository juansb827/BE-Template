const supertest = require('supertest')
const app = require('../src/app');

describe('Balances', () => {
    let request;

    beforeEach(() => {
        request = supertest.agent(app).set({ 'profile_id': '2' })
    })


    beforeAll(async () => {
        await require('../scripts/seedDb.js')
    })

    describe('POST /balances/deposit/:userId', () => {

        describe('when userId is the same as logged in user', () => {

            it('should return 400 status code and error message', async () => {
                const res = await request
                    .post('/balances/deposit/2')
                    .send()
                expect(res.statusCode).toEqual(400)
                expect(res.body).toEqual({
                    message: 'User cannot deposit itself'
                });
            })

        })

        describe('when user is trying to deposit above 25% of total of jobs to pay', () => {

            it('should return 400 status code and error message', async () => {
                const res = await request
                    .post('/balances/deposit/1')
                    .send({
                        "amount": 9999
                    })
                expect(res.statusCode).toEqual(400)
                expect(res.body).toEqual({
                    message: 'Deposit cannot be above 25% of total of jobs to pay'
                });
            })
        })


        describe('when user is a contractor', () => {

            it('should return 400 status code and error message', async () => {
                const res = await request
                    .post('/balances/deposit/1')
                    .set('profile_id', 5)
                    .send({
                        "amount": 9888
                    })
                expect(res.statusCode).toEqual(400)
                expect(res.body).toEqual({
                    message: 'Only clients can send/receive deposit'
                });
            })
        })

        describe('when user is trying to deposit to a contractor', () => {

            it('should return 400 status code and error message', async () => {
                const res = await request
                    .post('/balances/deposit/5')
                    .send({
                        "amount": 9888
                    })
                expect(res.statusCode).toEqual(400)
                expect(res.body).toEqual({
                    message: 'Only clients can send/receive deposit'
                });
            })
        })

        it('should be able to pay for the job', async () => {
            const res = await request
                .post('/balances/deposit/1')
                .send({
                    amount: 50
                })

            expect(res.statusCode).toEqual(200)
        })

    })
})