const supertest = require('supertest')
const app = require('../src/app');

describe('Admin', () => {
    let request;

    beforeEach(() => {
        request = supertest.agent(app).set({ 'profile_id': '2' })
    })


    beforeAll(async () => {
        await require('../scripts/seedDb.js')
    })

    describe('GET /admin/best-profession', () => {

        it('should return the most paid profession within the given time range', async () => {
            const res = await request
                .get('/admin/best-profession?start=2020-08-14&end=2020-08-19')
                .send()

            expect(res.statusCode).toEqual(200)
            expect(res.body).toMatchObject(
                {
                    "profession": "Programmer",
                    "total_earnings": 2683
                }
            )
        })

    })

    describe('GET /admin/best-clients', () => {

        describe('when there is NO `limit` query param', () => {

            it('should return the TWO clients that have spent the most on jobs within the time range', async () => {
                const res = await request
                    .get('/admin/best-clients?start=2020-04-17&end=2020-12-18')
                    .send()

                expect(res.statusCode).toEqual(200)
                expect(res.body).toMatchObject(
                    [
                        {
                            "id": 4,
                            "paid": 2020,
                            "fullName": "Ash Kethcum"
                        },
                        {
                            "id": 1,
                            "paid": 442,
                            "fullName": "Harry Potter"
                        }
                    ]
                )
            })
        });
       
        describe('when there is a `limit` query param', () => {

            it('should return the 3 clients that have spent the most on jobs within the time range', async () => {
                const res = await request
                    .get('/admin/best-clients?start=2020-04-17&end=2020-12-18&limit=3')
                    .send()

                expect(res.statusCode).toEqual(200)
                expect(res.body).toMatchObject(
                    [
                        {
                            "id": 4,
                            "paid": 2020,
                            "fullName": "Ash Kethcum"
                        },
                        {
                            "id": 1,
                            "paid": 442,
                            "fullName": "Harry Potter"
                        },
                        {
                            "id": 2,
                            "paid": 442,
                            "fullName": "Mr Robot"
                        }
                    ]
                )
            })
        });
    })

})