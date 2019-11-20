const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { getTestServer } = require('./test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Vocabulary find test suite', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany().exec();
        await Vocabulary.deleteMany().exec();
    });

    it('Findind dataset vocabulary without auth returns 200 OK and a data array', async () => {
        const response = await requester.get(`/api/v1/dataset/vocabulary/find`).send();
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
    });

    it('Findind widget vocabulary without auth returns 200 OK and a data array', async () => {
        const response = await requester.get(`/api/v1/dataset/123/widget/vocabulary/find`).send();
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
    });

    it('Findind layer vocabulary without auth returns 200 OK and a data array', async () => {
        const response = await requester.get(`/api/v1/dataset/123/layer/vocabulary/find`).send();
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
    });

    it('Findind all vocabulary without auth returns 200 OK and a data array', async () => {
        const response = await requester.get(`/api/v1/vocabulary`).send();
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
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
