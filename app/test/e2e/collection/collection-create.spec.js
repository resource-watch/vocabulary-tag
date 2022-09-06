const nock = require('nock');
const chai = require('chai');
const Collection = require('models/collection.model');
const { USERS } = require('../utils/test.constants');
const { ensureCorrectError, mockGetUserFromToken, getUUID } = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Create collections', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Collection.deleteMany({}).exec();
    });

    it('Create a collection without being authenticated should return a 401 error', async () => {
        const response = await requester
            .post(`/api/v1/collection`)
            .send();

        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Create a collection while being authenticated as a USER and the necessary body fields should return a 200 (happy case)', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .post(`/api/v1/collection`)
            .set('Authorization', `Bearer abcd`)
            .send({
                name: 'collection',
                application: 'rw'
            });

        response.status.should.equal(200);
        response.body.data.attributes.name.should.equal('collection');
        response.body.data.attributes.application.should.equal('rw');
        response.body.data.attributes.should.have.property('env').and.equal('production');
    });

    it('Create a collection with a custom env field should return a 200 and save the correct env', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .post(`/api/v1/collection`)
            .set('Authorization', `Bearer abcd`)
            .send({
                name: 'collection',
                application: 'rw',
                env: 'custom'
            });

        response.status.should.equal(200);
        response.body.data.attributes.name.should.equal('collection');
        response.body.data.attributes.application.should.equal('rw');
        response.body.data.attributes.should.have.property('env').and.equal('custom');
    });

    it('Create a collection with an invalid resource type should return a 400', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .post(`/api/v1/collection`)
            .set('Authorization', `Bearer abcd`)
            .send({
                name: 'collection',
                application: 'rw',
                resources: [{
                    id: getUUID(),
                    type: 'collection'
                }]
            });

        response.status.should.equal(400);
    });

    it('Create a collection with no resource id but valid resource type should return a 400', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .post(`/api/v1/collection`)
            .set('Authorization', `Bearer abcd`)
            .send({
                name: 'collection',
                application: 'rw',
                resources: [{
                    type: 'dataset',
                }]
            });

        response.status.should.equal(400);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Collection.deleteMany({}).exec();
    });
});
