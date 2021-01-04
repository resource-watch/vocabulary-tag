const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('../utils/test.constants');
const {
    assertOKResponse,
    mockWidget,
    assertForbiddenResponse,
    assertUnauthorizedResponse
} = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Update widget vocabulary', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Updating a vocabulary-widget relationship while not being authenticated should return a 401', async () => {
        // Mock the request for widget validation
        const mockWidgetId = mockWidget().id;
        const vocabName = 'fruits';
        const vocabData = { application: 'gfw', tags: ['bananas', 'apples'] };
        const vocabData2 = { application: 'gfw', tags: ['pears', 'avocados'] };

        // Test creation of vocabulary associated with the mock widget
        await requester.post(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        // Test the update of vocabulary associated with the mock widget
        const response = await requester
            .patch(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send(vocabData2);

        assertUnauthorizedResponse(response);
    });

    it('Updating a vocabulary-widget relationship while being authenticated as a USER should return a 403', async () => {
        // Mock the request for widget validation
        const mockWidgetId = mockWidget().id;
        const vocabName = 'fruits';
        const vocabData = { application: 'gfw', tags: ['bananas', 'apples'] };
        const vocabData2 = { application: 'gfw', tags: ['pears', 'avocados'] };

        // Test creation of vocabulary associated with the mock widget
        await requester.post(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        // Test the update of vocabulary associated with the mock widget
        const response = await requester
            .patch(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData2, loggedUser: USERS.USER });

        assertForbiddenResponse(response);
    });

    it('Updating a vocabulary-widget relationship while being authenticated as a MANAGER that does not own the resource should return a 403', async () => {
        // Mock the request for widget validation
        const mockWidgetId = mockWidget().id;
        const vocabName = 'fruits';
        const vocabData = { application: 'gfw', tags: ['bananas', 'apples'] };
        const vocabData2 = { application: 'gfw', tags: ['pears', 'avocados'] };

        // Test creation of vocabulary associated with the mock widget
        await requester.post(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        // Mock again the request for widget validation
        mockWidget(mockWidgetId);

        // Test the update of vocabulary associated with the mock widget
        const response = await requester
            .patch(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData2, loggedUser: USERS.MANAGER });

        assertForbiddenResponse(response);
    });

    it('Updating a vocabulary-widget relationship while being authenticated as a MANAGER that does owns the resource should return a 200 OK and updated data', async () => {
        // Mock the request for widget validation
        const mockWidgetId = mockWidget(null, { userId: USERS.MANAGER.id }).id;
        const vocabName = 'fruits';
        const vocabData = { application: 'gfw', tags: ['bananas', 'apples'] };
        const vocabData2 = { application: 'gfw', tags: ['pears', 'avocados'] };

        // Test creation of vocabulary associated with the mock widget
        await requester.post(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        // Mock again the request for widget validation
        mockWidget(mockWidgetId, { userId: USERS.MANAGER.id });

        // Test the update of vocabulary associated with the mock widget
        const response = await requester
            .patch(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData2, loggedUser: USERS.MANAGER });

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal(vocabName);
        response.body.data[0].attributes.should.have.property('application').and.equal(vocabData2.application);
        response.body.data[0].attributes.should.have.property('tags').and.deep.equal(vocabData2.tags);
    });

    it('Updating a vocabulary-widget relationship while being authenticated as an ADMIN should return a 200 OK and updated data', async () => {
        // Mock the request for widget validation
        const mockWidgetId = mockWidget().id;
        const vocabName = 'fruits';
        const vocabData = { application: 'gfw', tags: ['bananas', 'apples'] };
        const vocabData2 = { application: 'gfw', tags: ['pears', 'avocados'] };

        // Test creation of vocabulary associated with the mock widget
        await requester.post(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData, loggedUser: USERS.ADMIN });

        // Mock again the request for widget validation
        mockWidget(mockWidgetId);

        // Test the update of vocabulary associated with the mock widget
        const response = await requester
            .patch(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .send({ ...vocabData2, loggedUser: USERS.ADMIN });

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
