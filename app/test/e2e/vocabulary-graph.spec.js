const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('./utils/test.constants');
const {
    assertOKResponse,
    mockDataset,
    mockPostGraphAssociation,
    mockPutGraphAssociation,
    mockDeleteGraphAssociation,
} = require('./utils/helpers');
const { getTestServer } = require('./utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const assertCountOfVocabDatasetRelationships = async (datasetId, length) => {
    assertOKResponse(await requester
        .get(`/api/v1/dataset/${datasetId}/vocabulary`)
        .send({ loggedUser: USERS.ADMIN }), length);
};

const postVocabDatasetRelationship = async (datasetId, vocabName, vocabData = {}) => {
    const postData = {};
    postData[vocabName] = vocabData;
    mockPostGraphAssociation(datasetId);
    return requester.put(`/api/v1/dataset/${datasetId}/vocabulary`)
        .send({ ...postData, loggedUser: USERS.ADMIN });
};

const putVocabDatasetRelationship = async (datasetId, vocabName, vocabData = {}, graphSuccess = true) => {
    const putData = {};
    putData[vocabName] = vocabData;
    mockPostGraphAssociation(datasetId, graphSuccess);
    return requester.put(`/api/v1/dataset/${datasetId}/vocabulary`)
        .send({ ...putData, loggedUser: USERS.ADMIN });
};

const patchVocabDatasetRelationship = async (datasetId, vocabName, vocabData = {}, graphSuccess = true) => {
    mockDataset(datasetId);
    mockPutGraphAssociation(datasetId, graphSuccess);
    return requester.patch(`/api/v1/dataset/${datasetId}/vocabulary/${vocabName}`)
        .send({ ...vocabData, loggedUser: USERS.ADMIN });
};

const deleteVocabDatasetRelationship = async (datasetId, vocabName, graphSuccess = true) => {
    mockDataset(datasetId);
    mockDeleteGraphAssociation(datasetId, 'rw', graphSuccess);
    return requester
        .delete(`/api/v1/dataset/${datasetId}/vocabulary/${vocabName}?loggedUser=${JSON.stringify(USERS.ADMIN)}`)
        .send();
};

describe('Vocabulary interaction with Graph MS test suite', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('POSTing vocab-dataset relationships with auth returns 200 OK with created data', async () => {
        // Assert no relationships exist for the mock dataset created
        const mockDatasetId = mockDataset().id;
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 0);

        // POST one vocabulary relationship
        const postResponse = await postVocabDatasetRelationship(
            mockDatasetId,
            'knowledge_graph',
            { application: 'rw', tags: ['table'] },
        );
        assertOKResponse(postResponse);
        postResponse.body.data[0].attributes.should.have.property('name').and.be.equal('knowledge_graph');
        postResponse.body.data[0].attributes.should.have.property('tags').and.be.deep.equal(['table']);

        // Assert that exists one relationship for the mock dataset created
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 1);
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

    it('PUTting vocab-graph relationships when Graph request fails should return 200 OK with created data', async () => {
        // Assert no relationships exist for the mock dataset created
        const mockDatasetId = mockDataset().id;
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 0);

        // PUT one vocabulary relationship
        const putResponse = await putVocabDatasetRelationship(
            mockDatasetId,
            'knowledge_graph',
            { application: 'rw', tags: ['table'] },
            false,
        );
        assertOKResponse(putResponse);
        putResponse.body.data[0].attributes.should.have.property('name').and.be.equal('knowledge_graph');
        putResponse.body.data[0].attributes.should.have.property('tags').and.be.deep.equal(['table']);

        // Assert that exists one relationship for the mock dataset created
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 1);
    });

    it('PATCHing vocab-graph relationships when Graph request fails should return 200 OK with updated data', async () => {
        // PUT one vocabulary relationship
        const mockDatasetId = mockDataset().id;
        assertOKResponse(await putVocabDatasetRelationship(
            mockDatasetId,
            'knowledge_graph',
            { application: 'rw', tags: ['table'] },
        ));

        // Assert that exists one relationship for the mock dataset created
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 1);

        // PATCH the previously created relationship -- with error!
        const patchResponse = await patchVocabDatasetRelationship(
            mockDatasetId,
            'knowledge_graph',
            { application: 'rw', tags: ['vector'] },
            false,
        );
        assertOKResponse(patchResponse);
        patchResponse.body.data[0].attributes.should.have.property('name').and.be.equal('knowledge_graph');
        patchResponse.body.data[0].attributes.should.have.property('tags').and.be.deep.equal(['vector']);

        // Assert that still exists one relationship for the mock dataset updated
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 1);
    });

    it('DELETing vocab-graph relationships when Graph request fails should return 200 OK with no data', async () => {
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
        assertOKResponse(await deleteVocabDatasetRelationship(mockDatasetId, 'knowledge_graph', false));

        // Assert that no relationship exists for the mock dataset created
        await assertCountOfVocabDatasetRelationships(mockDatasetId, 0);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
