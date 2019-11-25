const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('./test.constants');
const {
    assertOKResponse,
    assertUnauthorizedResponse,
    mockDataset,
    mockPostGraphAssociation,
    mockPutGraphAssociation,
    mockDeleteGraphAssociation,
} = require('./utils');
const { getTestServer } = require('./test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const assertCountOfVocabDatasetRelationships = async (datasetId, length) => {
    assertOKResponse(await requester
        .get(`/api/v1/dataset/${datasetId}/vocabulary`)
        .send({ loggedUser: USERS.ADMIN }), length);
};

const putVocabDatasetRelationship = async (datasetId, vocabName, vocabData = {}) => {
    const putData = {};
    putData[vocabName] = vocabData;
    mockPostGraphAssociation(datasetId);
    return requester.put(`/api/v1/dataset/${datasetId}/vocabulary`)
        .send({ ...putData, loggedUser: USERS.ADMIN });
};

const patchVocabDatasetRelationship = async (datasetId, vocabName, vocabData = {}) => {
    mockDataset(datasetId);
    mockPutGraphAssociation(datasetId);
    return requester.patch(`/api/v1/dataset/${datasetId}/vocabulary/${vocabName}`)
        .send({ ...vocabData, loggedUser: USERS.ADMIN });
};

const deleteVocabDatasetRelationship = async (datasetId, vocabName) => {
    mockDataset(datasetId);
    mockDeleteGraphAssociation(datasetId);
    return requester
        .delete(`/api/v1/dataset/${datasetId}/vocabulary/${vocabName}?loggedUser=${JSON.stringify(USERS.ADMIN)}`)
        .send();
};

describe('Vocabulary-dataset relationships test suite', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany().exec();
        await Vocabulary.deleteMany().exec();
    });

    it('Creating a vocab-dataset relationship without auth returns 401 Unauthorized', async () => {
        assertUnauthorizedResponse(await requester
            .post(`/api/v1/dataset/123/vocabulary/science`)
            .send({ application: 'rw', tags: ['biology', 'chemistry'] }));
    });

    it('Creating a vocab-dataset relationship with auth returns 200 OK and created data', async () => {
        // Mock the request for dataset validation
        const mockDatasetId = mockDataset().id;

        // Prepare vocabulary test data
        const vocabName = 'science';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-dataset relationship
        const response = await requester
            .post(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal(vocabName);
    });

    it('Updating a vocab-dataset relationship with auth returns 200 OK and updated data', async () => {
        // Mock the request for dataset validation
        const mockDatasetId = mockDataset().id;
        const vocabName = 'fruits';
        const vocabData = { application: 'gfw', tags: ['bananas', 'apples'] };
        const vocabData2 = { application: 'gfw', tags: ['pears', 'avocados'] };

        // Test creation of vocabulary associated with the mock dataset
        await requester.post(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        // Mock again the request for dataset validation
        mockDataset(mockDatasetId);

        // Test the update of vocabulary associated with the mock dataset
        const response = await requester
            .patch(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData2, loggedUser: USERS.ADMIN });

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal(vocabName);
        response.body.data[0].attributes.should.have.property('application').and.equal(vocabData2.application);
        response.body.data[0].attributes.should.have.property('tags').and.deep.equal(vocabData2.tags);
    });

    it('Creating multiple vocab-dataset relationships with auth returns 200 OK and created data', async () => {
        // Mock the request for dataset validation
        const mockDatasetId = mockDataset().id;

        // Perform POST request for creating multiple vocabulary-dataset relationships
        const response = await requester
            .post(`/api/v1/dataset/${mockDatasetId}/vocabulary`)
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

    it('Deleting vocab-dataset relationship with auth returns 200 OK', async () => {
        // Mock the request for dataset validation
        const mockDatasetId = mockDataset().id;

        // Prepare vocabulary test data
        const vocabName = 'science_v2';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-dataset relationship
        await requester.post(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        // Mock the request for dataset validation
        mockDataset(mockDatasetId);

        // Perform DELETE request for deleting the vocabulary-dataset relationship
        const response = await requester
            .delete(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}?loggedUser=${JSON.stringify(USERS.ADMIN)}`).send();

        assertOKResponse(response);
    });

    it('Getting vocab-dataset relationships without auth returns 401 Unauthorized', async () => {
        assertUnauthorizedResponse(await requester.post(`/api/v1/dataset/123/vocabulary`).send());
    });

    it('Getting vocab-dataset relationships with auth returns 200 OK with the requested data', async () => {
        // Mock the request for dataset validation
        const mockDatasetId = mockDataset().id;

        // Prepare vocabulary test data
        const vocabName = 'science_v3';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-dataset relationship
        await requester.post(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        // Mock again the request for dataset validation
        mockDataset(mockDatasetId);

        // Perform GET request for the vocabulary-dataset relationships
        const response = await requester
            .post(`/api/v1/dataset/${mockDatasetId}/vocabulary`)
            .send({ loggedUser: USERS.ADMIN });

        assertOKResponse(response);
        response.body.data[0].attributes.should.have.property('name').and.equal('science_v3');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('tags').and.deep.equal(['biology', 'chemistry']);
    });

    it('PUTting vocab-dataset relationships with auth returns 200 OK with created data', async () => {
        // Assert no relationships exist for the mock dataset created
        const mockDatasetId = mockDataset().id;
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 0);

        // PUT one vocabulary relationship
        const putResponse = await putVocabDatasetRelationship(
            mockDatasetId,
            'knowledge_graph',
            { application: 'rw', tags: ['table'] },
        );
        assertOKResponse(putResponse);
        putResponse.body.data[0].attributes.should.have.property('name').and.be.equal('knowledge_graph');
        putResponse.body.data[0].attributes.should.have.property('tags').and.be.deep.equal(['table']);

        // Assert that exists one relationship for the mock dataset created
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 1);
    });

    it('PATCHing vocab-dataset relationships with auth returns 200 OK with updated data', async () => {
        // PUT one vocabulary relationship
        const mockDatasetId = mockDataset().id;
        assertOKResponse(await putVocabDatasetRelationship(
            mockDatasetId,
            'knowledge_graph',
            { application: 'rw', tags: ['table'] },
        ));

        // Assert that exists one relationship for the mock dataset created
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 1);

        // PATCH the previously created relationship
        const patchResponse = await patchVocabDatasetRelationship(
            mockDatasetId,
            'knowledge_graph',
            { application: 'rw', tags: ['vector'] },
        );
        assertOKResponse(patchResponse);
        patchResponse.body.data[0].attributes.should.have.property('name').and.be.equal('knowledge_graph');
        patchResponse.body.data[0].attributes.should.have.property('tags').and.be.deep.equal(['vector']);

        // Assert that still exists one relationship for the mock dataset updated
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 1);
    });

    it('DELETing vocab-dataset relationships with auth returns 200 OK with no data', async () => {
        // PUT one vocabulary relationship
        const mockDatasetId = mockDataset().id;
        assertOKResponse(await putVocabDatasetRelationship(
            mockDatasetId,
            'knowledge_graph',
            { application: 'rw', tags: ['table'] },
        ));

        // Assert that exists one relationship for the mock dataset created
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 1);

        // DELETE the previously created relationship
        assertOKResponse(await deleteVocabDatasetRelationship(mockDatasetId, 'knowledge_graph'));

        // Assert that no relationship exists for the mock dataset created
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 0);
    });

    it('PATCHing vocab-dataset relationships when the resource is not present in the vocabulary resources list returns 200 OK with updated data', async () => {
        const mockDatasetId = mockDataset().id;
        assertOKResponse(await putVocabDatasetRelationship(
            mockDatasetId,
            'knowledge_graph',
            { application: 'rw', tags: ['table'] },
        ));

        // Manually eliminate the resource from the vocabulary list
        const vocab = await Vocabulary.findOne({ id: 'knowledge_graph' });
        vocab.resources = [];
        await vocab.save();

        const patchResponse = await patchVocabDatasetRelationship(
            mockDatasetId,
            'knowledge_graph',
            { application: 'rw', tags: ['vector'] },
        );

        assertOKResponse(patchResponse);
        patchResponse.body.data[0].attributes.should.have.property('name').and.be.equal('knowledge_graph');
        patchResponse.body.data[0].attributes.should.have.property('tags').and.be.deep.equal(['vector']);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany().exec();
        await Vocabulary.deleteMany().exec();
    });
});
