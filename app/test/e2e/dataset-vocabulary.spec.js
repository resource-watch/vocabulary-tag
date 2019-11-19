const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('./test.constants');
const { mockDataset } = require('./utils');
const { getTestServer } = require('./test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Dataset vocabulary test suite', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        Resource.remove({}).exec();
        Vocabulary.remove({}).exec();
    });

    it('Creating a vocabulary-dataset relationship requires authorization', async () => {
        const mockDatasetId = new Date().getTime();
        const vocabName = 'science';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        const response = await requester
            .post(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .send(vocabData);

        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Creating a vocabulary-dataset relationship with authorization should be successful', async () => {
        const mockDatasetId = new Date().getTime();
        const vocabName = 'science';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        mockDataset({ nock, id: mockDatasetId });

        // Test creation of vocabulary associated with the mock dataset
        const response = await requester
            .post(`/api/v1/dataset/${mockDatasetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
        response.body.data[0].should.have.property('id').and.equal(vocabName);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(() => {
        Resource.remove({}).exec();
        Vocabulary.remove({}).exec();
    });
});
