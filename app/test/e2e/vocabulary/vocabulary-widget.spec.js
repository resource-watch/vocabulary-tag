const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('../utils/test.constants');
const { mockWidget } = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('vocabulary-widget relationships test suite', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Getting vocabulary-widget relationships without auth returns 401 Unauthorized', async () => {
        // Perform GET request for the vocabulary-widget relationships
        const response = await requester.post(`/api/v1/dataset/123/widget/123/vocabulary`).send();

        // Assert the response as 401 Unauthorized
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Getting vocabulary-widget relationships with auth returns 200 OK with the requested data', async () => {
        // Mock the request for widget validation
        const mockWidgetId = mockWidget().id;

        // Prepare vocabulary test data
        const vocabName = 'science-widget';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-widget relationship
        await requester.post(`/api/v1/dataset/123/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        // Mock again the request for widget validation
        mockWidget(mockWidgetId);

        // Perform GET request for the vocabulary-widget relationships
        const response = await requester
            .post(`/api/v1/dataset/123/widget/${mockWidgetId}/vocabulary`)
            .send({ loggedUser: USERS.ADMIN });

        // Assert the response as 200 OK
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
        response.body.data[0].attributes.should.have.property('name').and.equal(vocabName);
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('tags').and.deep.equal(['biology', 'chemistry']);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
