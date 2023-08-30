const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('../utils/test.constants');
const {
    assertOKResponse,
    mockLayer,
    assertUnauthorizedResponse,
    assertForbiddenResponse,
    mockValidateRequestWithApiKeyAndUserToken, mockValidateRequestWithApiKey
} = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Delete layer vocabulary', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Deleting a vocabulary-layer relationship while not being authenticated should return a 401', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKey({});
        // Mock the request for layer validation
        const mockLayerId = mockLayer().id;

        // Prepare vocabulary test data
        const vocabName = 'science_v2';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-layer relationship
        await requester.post(`/api/v1/dataset/321/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData);

        // Perform DELETE request for deleting the vocabulary-layer relationship
        const response = await requester
            .delete(`/api/v1/dataset/321/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertUnauthorizedResponse(response);
    });

    it('Deleting a vocabulary-layer relationship while being authenticated as an USER should return a 403', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        // Mock the request for layer validation
        const mockLayerId = mockLayer().id;

        // Prepare vocabulary test data
        const vocabName = 'science_v2';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-layer relationship
        await requester.post(`/api/v1/dataset/321/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData);

        // Perform DELETE request for deleting the vocabulary-layer relationship
        const response = await requester
            .delete(`/api/v1/dataset/321/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertForbiddenResponse(response);
    });

    it('Deleting a vocabulary-layer relationship while being authenticated as a MANAGER that does not own the resource should return a 403', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
        // Mock the request for layer validation
        const mockLayerId = mockLayer().id;

        // Prepare vocabulary test data
        const vocabName = 'science_v2';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-layer relationship
        await requester.post(`/api/v1/dataset/321/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData);

        // Mock the request for layer validation
        mockLayer(mockLayerId);

        // Perform DELETE request for deleting the vocabulary-layer relationship
        const response = await requester
            .delete(`/api/v1/dataset/321/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertForbiddenResponse(response);
    });

    it('Deleting a vocabulary-layer relationship while being authenticated as a MANAGER that owns the resource should return a 200', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
        // Mock the request for layer validation
        const mockLayerId = mockLayer(null, { userId: USERS.MANAGER.id }).id;

        // Prepare vocabulary test data
        const vocabName = 'science_v2';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-layer relationship
        await requester.post(`/api/v1/dataset/321/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData);

        // Mock the request for layer validation
        mockLayer(mockLayerId, { userId: USERS.MANAGER.id });

        // Perform DELETE request for deleting the vocabulary-layer relationship
        const response = await requester
            .delete(`/api/v1/dataset/321/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertOKResponse(response);
    });

    it('Deleting a vocabulary-layer relationship while being authenticated as an ADMIN returns 200 OK', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        // Mock the request for layer validation
        const mockLayerId = mockLayer().id;

        // Prepare vocabulary test data
        const vocabName = 'science_v2';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-layer relationship
        await requester.post(`/api/v1/dataset/321/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData);

        // Mock the request for layer validation
        mockLayer(mockLayerId);

        // Perform DELETE request for deleting the vocabulary-layer relationship
        const response = await requester
            .delete(`/api/v1/dataset/321/layer/${mockLayerId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertOKResponse(response);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
