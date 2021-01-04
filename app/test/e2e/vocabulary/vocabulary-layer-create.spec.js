const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('../utils/test.constants');
const {
    assertOKResponse,
    assertUnauthorizedResponse,
    assertForbiddenResponse,
    mockLayer
} = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Create layer vocabulary', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Creating a vocabulary-layer relationship without auth returns 401 Unauthorized', async () => {
        assertUnauthorizedResponse(await requester
            .post(`/api/v1/dataset/345/layer/123/vocabulary/science`)
            .send({ application: 'rw', tags: ['biology', 'chemistry'] }));
    });

    it('Creating a vocabulary-layer relationship while being authenticated as a USER should return a 403 Forbidden', async () => {
        assertForbiddenResponse(await requester
            .post(`/api/v1/dataset/345/layer/123/vocabulary/science`)
            .send({ application: 'rw', tags: ['biology', 'chemistry'], loggedUser: USERS.USER }));
    });

    it('Creating a vocabulary-layer relationship while being authenticated as a MANAGER that does not own the resource should return a 403 Forbidden', async () => {
        const mockLayerId = mockLayer().id;

        const vocabName = 'science';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        assertForbiddenResponse(await requester
            .post(`/api/v1/dataset/345/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.MANAGER }));
    });

    it('Creating a vocabulary-layer relationship while being authenticated as a MANAGER that owns the resource should return a 200', async () => {
        const mockLayerId = mockLayer(null, { userId: USERS.MANAGER.id }).id;

        const vocabName = 'science';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        const response = await requester
            .post(`/api/v1/dataset/345/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.MANAGER });

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal(vocabName);
    });

    it('Creating a vocabulary-layer relationship while being authenticated as an ADMIN should return 200 OK and created data', async () => {
        // Mock the request for layer validation
        const mockLayerId = mockLayer().id;

        // Prepare vocabulary test data
        const vocabName = 'science';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-layer relationship
        const response = await requester
            .post(`/api/v1/dataset/345/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal(vocabName);
    });

    it('Creating multiple vocabulary-layer relationships with auth returns 200 OK and created data', async () => {
        // Mock the request for layer validation
        const mockLayerId = mockLayer().id;

        // Perform POST request for creating multiple vocabulary-layer relationships
        const response = await requester
            .post(`/api/v1/dataset/345/layer/${mockLayerId}/vocabulary`)
            .send({
                physics: { application: 'gfw', tags: ['quantum', 'universe'] },
                geography: { application: 'rw', tags: ['countries', 'cities'] },
                loggedUser: USERS.ADMIN
            });

        assertOKResponse(response);
        response.body.data[0].attributes.should.have.property('name').and.equal('physics');
        response.body.data[0].attributes.should.have.property('application').and.equal('gfw');
        response.body.data[0].attributes.should.have.property('tags').and.deep.equal(['quantum', 'universe']);
        response.body.data[1].attributes.should.have.property('name').and.equal('geography');
        response.body.data[1].attributes.should.have.property('application').and.equal('rw');
        response.body.data[1].attributes.should.have.property('tags').and.deep.equal(['countries', 'cities']);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
