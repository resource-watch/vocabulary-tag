const nock = require('nock');
const chai = require('chai');
const Collection = require('models/collection.model');

const { assertOKResponse, createCollection } = require('./utils/helpers');
const { USERS } = require('./utils/test.constants');

const { getTestServer } = require('./utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Collection find test suite', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Collection.deleteMany().exec();
    });

    it('Finding collections requires authentication, returning 401 Unauthorized if an invalid token is provided', async () => {
        const response = await requester.get(`/api/v1/collection`).send();
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array').and.have.length(1);
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Finding collections providing authentication returns 200 OK and a data array', async () => {
        const loggedUser = JSON.stringify(USERS.USER);
        assertOKResponse(await requester.get(`/api/v1/collection?loggedUser=${loggedUser}`).send(), 0);
    });

    it('Finding collections returns all the collections associated with the user who made the request, returning 200 OK and a data array', async () => {
        const loggedUser = JSON.stringify(USERS.USER);
        await new Collection(createCollection()).save();
        await new Collection(createCollection('rw', USERS.USER.id)).save();
        assertOKResponse(await requester.get(`/api/v1/collection?loggedUser=${loggedUser}`).send(), 1);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Collection.deleteMany().exec();
    });
});
