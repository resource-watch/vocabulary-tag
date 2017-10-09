const Router = require('koa-router');
const logger = require('logger');
const CollectionModel = require('models/collection');
const CollectionSerializer = require('serializers/collectionSerializer');
const ctRegisterMicroservice = require('ct-register-microservice-node');
const CollectionValidator = require('validators/collectionValidator');


const router = new Router({
    prefix: '/collection'
});

class CollectionRouter {

    static* getAll () {

        logger.info('Obtaining collection by user');
        const filters = {
            ownerId: JSON.parse(this.query.loggedUser).id
        };
        
        const data = yield CollectionModel.find(filters);

        if (this.query.include && this.query.include === 'true') {
            logger.debug('including resources');
            let widgets = [];
            let datasets = [];
            let layers = [];
            data.map(resource => {
                if (resource.resourceType === 'dataset') {
                    datasets.push(resource.resourceId);
                } else if (resource.resourceType === 'layer') {
                    layers.push(resource.resourceId);
                } else {
                    widgets.push(resource.resourceId);
                }
            });
            
            try {
                if (datasets.length > 0){
                    logger.debug('Loading datasets');
                    const datasetResources = yield ctRegisterMicroservice.requestToMicroservice({
                        uri: `/dataset?ids=${datasets.join(',')}`,
                        method: 'GET',
                        json: true
                    });
                    for (let i = 0, length = datasetResources.data.length; i < length; i++) {
                        const dataset = datasetResources.data[i];
                        for (let j = 0, lengthData = data.length; j < lengthData; j++) {
                            if (data[j].resourceType === 'dataset' && data[j].resourceId === dataset.id) {
                                data[j] = data[j].toObject();
                                data[j].resource = dataset;
                                break;
                            }
                        }
                    }                    
                }
                logger.debug('Loading widgets', widgets);
                if (widgets.length > 0){
                    logger.debug('Loading widgets', widgets);
                    const widgetResources = yield ctRegisterMicroservice.requestToMicroservice({
                        uri: `/widget?ids=${widgets.join(',')}`,
                        method: 'GET',
                        json: true
                    });
                    logger.info('Obtained', widgetResources);

                    for (let i = 0, length = widgetResources.data.length; i < length; i++) {
                        const widget = widgetResources.data[i];
                        for (let j = 0, lengthData = data.length; j < lengthData; j++) {
                            if (data[j].resourceType === 'widget' && data[j].resourceId === widget.id) {
                                data[j] = data[j].toObject();
                                data[j].resource = widget;
                                break;
                            }
                        }
                    }                    
                }
                logger.info('Loading layers', layers);
                if (layers.length > 0){
                    logger.info('Loading layers', layers);
                    for(let i = 0, length = layers.length; i < length; i++) {
                        try {
                            const layerResource = yield ctRegisterMicroservice.requestToMicroservice({
                                uri: `/layer/${layers[i]}`,
                                method: 'GET',
                                json: true
                            });
                            for (let j = 0, lengthData = data.length; j < lengthData; j++) {
                                if (data[j].resourceType === 'layer' && data[j].resourceId === layers[i]) {
                                    data[j] = data[j].toObject();
                                    data[j].resource = layerResource.data;
                                    break;
                                }
                            }
                        } catch(err) {
                            logger.error(err);
                        }
                    }                
                }
            } catch (err) {
                logger.error(err);
                this.throw(400, 'Error obtaining include');
            }
        }

        this.body = CollectionSerializer.serialize(data);

    }
    
    static* getById () {

        logger.info('Obtaining collection by id', this.params.id);
        this.body = CollectionSerializer.serialize(this.state.col);

    }

    static* postCollection () {

        logger.info('Creating collection with body ', this.request.body);
        const body = {
            name: this.request.body.name,
            ownerId: this.request.body.loggedUser.id,  
            resources: this.request.body.resources || []
        };

        const data = yield new CollectionModel(body).save();

        this.body = CollectionSerializer.serialize(data);

    }

    static* postResource () { 

        logger.info('Creating new resource in collection with id ', this.params.id);

        this.state.col.resources.push(this.request.body);

        yield this.state.col.save(); 

        this.body = CollectionSerializer.serialize(this.state.col);
    }

    static* patchCollection () {

        logger.info('Updating collection by id ', this.params.id);
        
        this.state.col.name = this.request.body.name;

        yield this.state.col.save();   

        this.body = CollectionSerializer.serialize(this.state.col);


    }

    static* deleteCollection () {

        logger.info('Deleting collection by id ', this.params.id);
        yield this.state.col.remove();
        this.body = CollectionSerializer.serialize(this.state.col);

    }

    static* deleteResource () {

        logger.debug('Deleting resource from collection.', this.state.col);

        this.state.col.resources = this.state.col.resources
            .filter(res => res.id !== this.params.resourceId)
            .filter(res => res.type !== this.params.resourceType); 
        
        yield this.state.col.save();        

        this.body = CollectionSerializer.serialize(this.state.col);

    }

}


const existCollection = function* (next) {
    logger.debug('Checking if collection exists');
    let loggedUser;
    if(this.method === 'GET' || this.method === 'DELETE') {
        loggedUser = JSON.parse(this.query.loggedUser);
    }
    else {
        loggedUser = this.request.body.loggedUser;
    }
    const col = yield CollectionModel.findById(this.params.id);
    if (!col || ((loggedUser.id !== col.ownerId) && loggedUser.role !== 'ADMIN')) {
        this.throw(404, 'Collection not found');
        return;
    }
    this.state.col = col;
    yield next;
};


const existResourceInCollection = function* (next) {
    logger.debug('Checking if resource exists in collection');
    const exist = this.state.col.resources.find(res => res.id === this.request.body.id && res.type === this.request.body.type);
    if (exist) {
        this.throw(400, 'Resource duplicated');
        return;
    }
    
    yield next;
};

router.get('/', CollectionRouter.getAll);
router.get('/:id', existCollection, CollectionRouter.getById);

router.post('/', CollectionValidator.validate, CollectionRouter.postCollection);
router.post('/:id/resource', existCollection, existResourceInCollection, CollectionRouter.postResource);

router.patch('/:id', existCollection, CollectionRouter.patchCollection);

router.delete('/:id', existCollection, CollectionRouter.deleteCollection);
router.delete('/:id/resource/:resourceType/:resourceId', existCollection, CollectionRouter.deleteResource);

module.exports = router;
