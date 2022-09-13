const nock = require('nock');
const chai = require('chai');
const Collection = require('models/collection.model');
const { USERS } = require('../utils/test.constants');
const { ensureCorrectError, mockGetUserFromToken, createCollection } = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Update collections', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Collection.deleteMany({}).exec();
    });

    it('Update a collection without being authenticated should return a 401 error', async () => {
        const collection = await new Collection(createCollection({
            application: 'rw',
            ownerId: USERS.USER.id
        })).save();

        const response = await requester
            .patch(`/api/v1/collection/${collection.id}`)
            .send();

        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Update a collection while being authenticated as a USER and the correct body fields should return a 200 and update name and/or env (happy case)', async () => {
        mockGetUserFromToken(USERS.USER);
        const collection = await new Collection(createCollection({
            name: 'name',
            application: 'rw',
            ownerId: USERS.USER.id
        })).save();

        const response = await requester
            .patch(`/api/v1/collection/${collection.id}`)
            .set('Authorization', `Bearer abcd`)
            .send({
                name: 'new collection name',
                application: 'gfw',
                env: 'custom'
            });

        response.status.should.equal(200);
        response.body.data.attributes.name.should.equal('new collection name');
        response.body.data.attributes.application.should.equal('rw');
        response.body.data.attributes.env.should.equal('custom');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Collection.deleteMany({}).exec();
    });
});
