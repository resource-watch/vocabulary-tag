const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('../utils/test.constants');
const {
    assertOKResponse,
    assertUnauthorizedResponse,
    assertForbiddenResponse,
    mockDataset,
    mockGetUserFromToken
} = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Create multiple vocabulary for a dataset', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Creating a vocabulary-dataset relationship without auth returns 401 Unauthorized', async () => {
        assertUnauthorizedResponse(await requester
            .post(`/api/v1/dataset/123/vocabulary`)
            .send({
                vocabulary1: {
                    tags: ['biology', 'chemistry'],
                    application: 'rw',
                },
                vocabulary2: {
                    tags: ['biology', 'chemistry'],
                    application: 'rw',
                }
            }));
    });

    it('Creating a vocabulary-dataset relationship while being authenticated as a USER should return a 403 Forbidden', async () => {
        mockGetUserFromToken(USERS.USER);
        assertForbiddenResponse(await requester
            .post(`/api/v1/dataset/123/vocabulary`)
            .set('Authorization', `Bearer abcd`)
            .send({
                vocabulary1: {
                    tags: ['biology', 'chemistry'],
                    application: 'rw',
                },
                vocabulary2: {
                    tags: ['biology', 'chemistry'],
                    application: 'rw',
                },
            }));
    });

    it('Creating a vocabulary-dataset relationship while being authenticated as a MANAGER that does not own the resource should return a 403 Forbidden', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        const mockDatasetId = mockDataset().id;

        const vocabData = {
            vocabulary1: {
                tags: ['biology', 'chemistry'],
                application: 'rw',
            },
            vocabulary2: {
                tags: ['biology', 'chemistry'],
                application: 'rw',
            }
        };

        const response = await requester
            .post(`/api/v1/dataset/${mockDatasetId}/vocabulary`)
            .set('Authorization', `Bearer abcd`)
            .send(vocabData);

        assertForbiddenResponse(response);
    });

    it('Creating a vocabulary-dataset relationship while being authenticated as a MANAGER that owns the resource should return a 200', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        const mockDatasetId = mockDataset(null, { userId: USERS.MANAGER.id }).id;

        const vocabData = {
            vocabulary1: {
                tags: ['biology', 'chemistry'],
                application: 'rw',
            },
            vocabulary2: {
                tags: ['biology', 'chemistry'],
                application: 'rw',
            }
        };

        const response = await requester
            .post(`/api/v1/dataset/${mockDatasetId}/vocabulary`)
            .set('Authorization', `Bearer abcd`)
            .send(vocabData);

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal('vocabulary1');
        response.body.data[1].should.have.property('id').and.equal('vocabulary2');
    });

    it('Creating a vocabulary-dataset relationship while being authenticated as a MANAGER that owns the resource but does not belong to the same application as the resource should return a 403 Forbidden', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        const mockDatasetId = mockDataset(null, { userId: USERS.MANAGER.id, application: ['fake'] }).id;

        const vocabData = {
            vocabulary1: {
                tags: ['biology', 'chemistry'],
                application: 'rw',
            },
            vocabulary2: {
                tags: ['biology', 'chemistry'],
                application: 'rw',
            }
        };

        const response = await requester
            .post(`/api/v1/dataset/${mockDatasetId}/vocabulary`)
            .set('Authorization', `Bearer abcd`)
            .send(vocabData);

        assertForbiddenResponse(response);
    });

    it('Creating a vocabulary-dataset relationship for a different app while being authenticated as a MANAGER that owns the resource should return a 200', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        const mockDatasetId = mockDataset(null, { userId: USERS.MANAGER.id }).id;

        const vocabData = {
            vocabulary1: {
                tags: ['biology', 'chemistry'],
                application: 'fake',
            },
            vocabulary2: {
                tags: ['biology', 'chemistry'],
                application: 'app',
            }
        };

        const response = await requester
            .post(`/api/v1/dataset/${mockDatasetId}/vocabulary`)
            .set('Authorization', `Bearer abcd`)
            .send(vocabData);

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal('vocabulary1');
        response.body.data[1].should.have.property('id').and.equal('vocabulary2');
    });

    it('Creating a vocabulary-dataset relationship while being authenticated as an ADMIN should return 200 OK and created data', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        // Mock the request for dataset validation
        const mockDatasetId = mockDataset().id;

        const vocabData = {
            vocabulary1: {
                tags: ['biology', 'chemistry'],
                application: 'rw',
            },
            vocabulary2: {
                tags: ['physics', 'universe'],
                application: 'gfw',
            }
        };

        // Perform POST request for creating the vocabulary-dataset relationship
        const response = await requester
            .post(`/api/v1/dataset/${mockDatasetId}/vocabulary`)
            .set('Authorization', `Bearer abcd`)
            .send(vocabData);

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal('vocabulary1');

        response.body.data[1].should.have.property('id').and.equal('vocabulary2');

        response.body.data[0].attributes.should.have.property('name').and.equal('vocabulary1');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('tags').and.deep.equal(['biology', 'chemistry']);

        response.body.data[1].attributes.should.have.property('name').and.equal('vocabulary2');
        response.body.data[1].attributes.should.have.property('application').and.equal('gfw');
        response.body.data[1].attributes.should.have.property('tags').and.deep.equal(['physics', 'universe']);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
