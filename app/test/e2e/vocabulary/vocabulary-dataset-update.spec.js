const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('../utils/test.constants');
const {
    assertOKResponse,
    mockDataset,
    assertForbiddenResponse,
    assertUnauthorizedResponse,
    mockValidateRequestWithApiKeyAndUserToken, mockValidateRequestWithApiKey
} = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Update dataset vocabulary', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Updating a vocabulary-dataset relationship while not being authenticated should return a 401', async () => {
        mockValidateRequestWithApiKey({});
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        // Mock the request for dataset validation
        const mockDatasetId = mockDataset().id;
        const vocabName = 'fruits';
        const vocabData = { application: 'gfw', tags: ['bananas', 'apples'] };
        const vocabData2 = { application: 'gfw', tags: ['pears', 'avocados'] };

        // Test creation of vocabulary associated with the mock dataset
        await requester.post(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData);

        // Test the update of vocabulary associated with the mock dataset
        const response = await requester
            .patch(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData2);

        assertUnauthorizedResponse(response);
    });

    it('Updating a vocabulary-dataset relationship while being authenticated as a USER should return a 403', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        // Mock the request for dataset validation
        const mockDatasetId = mockDataset().id;
        const vocabName = 'fruits';
        const vocabData = { application: 'gfw', tags: ['bananas', 'apples'] };
        const vocabData2 = { application: 'gfw', tags: ['pears', 'avocados'] };

        // Test creation of vocabulary associated with the mock dataset
        await requester.post(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData);

        // Test the update of vocabulary associated with the mock dataset
        const response = await requester
            .patch(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData2);

        assertForbiddenResponse(response);
    });

    it('Updating a vocabulary-dataset relationship while being authenticated as a MANAGER that does not own the resource should return a 403', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
        // Mock the request for dataset validation
        const mockDatasetId = mockDataset().id;
        const vocabName = 'fruits';
        const vocabData = { application: 'gfw', tags: ['bananas', 'apples'] };
        const vocabData2 = { application: 'gfw', tags: ['pears', 'avocados'] };

        // Test creation of vocabulary associated with the mock dataset
        await requester.post(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData);

        // Mock again the request for dataset validation
        mockDataset(mockDatasetId);

        // Test the update of vocabulary associated with the mock dataset
        const response = await requester
            .patch(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData2);

        assertForbiddenResponse(response);
    });

    it('Updating a vocabulary-dataset relationship while being authenticated as a MANAGER that does owns the resource should return a 200 OK and updated data', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
        // Mock the request for dataset validation
        const mockDatasetId = mockDataset(null, { userId: USERS.MANAGER.id }).id;
        const vocabName = 'fruits';
        const vocabData = { application: 'gfw', tags: ['bananas', 'apples'] };
        const vocabData2 = { application: 'gfw', tags: ['pears', 'avocados'] };

        // Test creation of vocabulary associated with the mock dataset
        await requester.post(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData);

        // Mock again the request for dataset validation
        mockDataset(mockDatasetId, { userId: USERS.MANAGER.id });

        // Test the update of vocabulary associated with the mock dataset
        const response = await requester
            .patch(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData2);

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal(vocabName);
        response.body.data[0].attributes.should.have.property('application').and.equal(vocabData2.application);
        response.body.data[0].attributes.should.have.property('tags').and.deep.equal(vocabData2.tags);
    });

    it('Updating a vocabulary-dataset relationship while being authenticated as an ADMIN should return a 200 OK and updated data', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        // Mock the request for dataset validation
        const mockDatasetId = mockDataset().id;
        const vocabName = 'fruits';
        const vocabData = { application: 'gfw', tags: ['bananas', 'apples'] };
        const vocabData2 = { application: 'gfw', tags: ['pears', 'avocados'] };

        // Test creation of vocabulary associated with the mock dataset
        await requester.post(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData);

        // Mock again the request for dataset validation
        mockDataset(mockDatasetId);

        // Test the update of vocabulary associated with the mock dataset
        const response = await requester
            .patch(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send(vocabData2);

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal(vocabName);
        response.body.data[0].attributes.should.have.property('application').and.equal(vocabData2.application);
        response.body.data[0].attributes.should.have.property('tags').and.deep.equal(vocabData2.tags);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
