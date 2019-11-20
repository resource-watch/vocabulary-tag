const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('./test.constants');
const { mockWidget } = require('./utils');
const { getTestServer } = require('./test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Vocabulary-widget relationships test suite', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany().exec();
        await Vocabulary.deleteMany().exec();
    });

    it('Creating a vocabulary-widget relationship requires authorization', async () => {
        // Prepare vocabulary test data
        const vocabName = 'science';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-dataset relationship
        const response = await requester
            .post(`/api/v1/dataset/123/widget/123/vocabulary/${vocabName}`)
            .send(vocabData);

        // Assert the response as 401 Unauthorized
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Creating a vocabulary-widget relationship with authorization should be successful', async () => {
        // Mock the request for widget validation
        const mockWidgetId = mockWidget().id;

        // Prepare vocabulary test data
        const vocabName = 'science';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-widget relationship
        const response = await requester
            .post(`/api/v1/dataset/123/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        // Assert the response as 200 OK with the created data in the body of the request
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
        response.body.data[0].should.have.property('id').and.equal(vocabName);
    });

    it('Updating a vocabulary-widget relationship with authorization should be successful', async () => {
        // Mock the request for widget validation
        const mockWidgetId = mockWidget().id;

        // Prepare vocabulary test data
        const vocabName = 'fruits';
        const vocabData = { application: 'gfw', tags: ['bananas', 'apples'] };
        const vocabData2 = { application: 'gfw', tags: ['pears', 'avocados'] };

        // Test creation of vocabulary associated with the mock dataset
        await requester.post(`/api/v1/dataset/123/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        // Mock again the request for widget validation
        mockWidget(mockWidgetId);

        // Test the update of vocabulary associated with the mock dataset
        const response = await requester
            .patch(`/api/v1/dataset/123/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData2, loggedUser: USERS.ADMIN });

        // Assert the response as 200 OK with the updated data in the body of the request
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
        response.body.data[0].should.have.property('id').and.equal(vocabName);
        response.body.data[0].attributes.should.have.property('application').and.equal(vocabData2.application);
        response.body.data[0].attributes.should.have.property('tags').and.deep.equal(vocabData2.tags);
    });

    it('Creating multiple vocabulary-widget relationships with authorization should be successful', async () => {
        // Mock the request for widget validation
        const mockWidgetId = mockWidget().id;

        // Perform POST request for creating multiple vocabulary-dataset relationships
        const response = await requester
            .post(`/api/v1/dataset/123/widget/${mockWidgetId}/vocabulary`)
            .send({
                physics: { application: 'gfw', tags: ['quantum', 'universe'] },
                geography: { application: 'rw', tags: ['countries', 'cities'] },
                loggedUser: USERS.ADMIN
            });

        // Assert the response as 200 OK with the created data in the body of the request
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
        response.body.data[0].attributes.should.have.property('name').and.equal('physics');
        response.body.data[0].attributes.should.have.property('application').and.equal('gfw');
        response.body.data[0].attributes.should.have.property('tags').and.deep.equal(['quantum', 'universe']);
        response.body.data[1].attributes.should.have.property('name').and.equal('geography');
        response.body.data[1].attributes.should.have.property('application').and.equal('rw');
        response.body.data[1].attributes.should.have.property('tags').and.deep.equal(['countries', 'cities']);
    });

    it('Deleting vocabulary-widget relationship with authorization should be successful', async () => {
        // Mock the request for widget validation
        const mockWidgetId = mockWidget().id;

        // Prepare vocabulary test data
        const vocabName = 'sciencev2';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-dataset relationship
        await requester.post(`/api/v1/dataset/123/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        // Mock the request for dataset validation
        mockWidget(mockWidgetId);

        // Perform DELETE request for deleting the vocabulary-dataset relationship
        const response = await requester
            .delete(`/api/v1/dataset/123/widget/${mockWidgetId}/vocabulary/${vocabName}?loggedUser=${JSON.stringify(USERS.ADMIN)}`)
            .send();

        // Assert the response as 200 OK with the created data in the body of the request
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
    });

    it('Getting vocabulary-widget relationships without authorization should NOT be successful', async () => {
        // Perform GET request for the vocabulary-widget relationships
        const response = await requester.post(`/api/v1/dataset/123/widget/123/vocabulary`).send();

        // Assert the response as 401 Unauthorized
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Getting vocabulary-widget relationships with authorization should be successful', async () => {
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

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(async () => {
        await Resource.deleteMany().exec();
        await Vocabulary.deleteMany().exec();
    });
});
