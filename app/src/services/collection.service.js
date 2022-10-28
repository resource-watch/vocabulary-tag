const logger = require('logger');
const Collection = require('models/collection.model');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

class CollectionService {

    static async getAll(user, query = {}) {
        logger.info(`[CollectionService - getAll]: Getting all collections`);
        const sort = query.sort || '';
        const page = query['page[number]'] ? parseInt(query['page[number]'], 10) : 1;
        const limit = query['page[size]'] ? parseInt(query['page[size]'], 10) : 9999999;

        const filteredQuery = CollectionService.getFilteredQuery({ ...query }, user);
        const filteredSort = CollectionService.getFilteredSort(sort);
        const options = {
            page,
            limit,
            sort: filteredSort
        };
        const collections = await Collection.paginate(filteredQuery, options);

        if (query.include && query.include === 'true') {
            logger.debug('including resources');
            const widgetIds = [];
            const datasetIds = [];
            const layerIds = [];

            const datasets = {};
            const widgets = {};
            const layers = {};

            // Compile a list of ids for the 3 resource types
            collections.docs.forEach((collection) => {
                collection.resources.forEach((resource) => {
                    switch (resource.type) {

                        case 'dataset':
                            datasetIds.push(resource.id);
                            break;
                        case 'layer':
                            layerIds.push(resource.id);
                            break;
                        case 'widget':
                            widgetIds.push(resource.id);
                            break;
                        default:
                            logger.warn(`Unexpected collection resource of type ${resource.type}`);

                    }
                });
            });

            // Load all datasets by id
            try {
                if (datasetIds.length > 0) {
                    logger.debug('Loading datasets');
                    const getDatasetsResponse = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/v1/dataset?ids=${datasetIds.join(',')}`,
                        method: 'GET',
                        json: true
                    });
                    getDatasetsResponse.data.forEach((dataset) => {
                        datasets[dataset.id] = dataset;
                    });
                }
            } catch (err) {
                logger.error(err);
                throw new Error(400, 'Error obtaining included datasets');
            }

            // Load all widgets by id
            try {
                if (widgetIds.length > 0) {
                    logger.debug('Loading widgets');
                    const getWidgetsResponse = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/v1/widget?ids=${widgetIds.join(',')}`,
                        method: 'GET',
                        json: true
                    });
                    getWidgetsResponse.data.forEach((widget) => {
                        widgets[widget.id] = widget;
                    });
                }
            } catch (err) {
                logger.error(err);
                throw new Error(400, 'Error obtaining included widgets');
            }

            // Load all layers by id
            try {
                if (layerIds.length > 0) {
                    logger.debug('Loading layers');
                    const getLayersPromises = layerIds.map((layerId) => RWAPIMicroservice.requestToMicroservice({
                        uri: `/v1/layer/${layerId}`,
                        method: 'GET',
                        json: true
                    }));

                    const getLayersResponse = await Promise.all(getLayersPromises);
                    getLayersResponse.forEach((layerResponse) => {
                        layers[layerResponse.data.id] = layerResponse.data;
                    });
                }
            } catch (err) {
                logger.error(err);
                throw new Error(400, 'Error obtaining included layers');
            }

            // Reconcile imported resources
            collections.docs = collections.docs.map((collectionModel) => {
                const collection = collectionModel.toObject();

                collection.resources = collection.resources.map((resource) => {
                    switch (resource.type) {

                        case 'dataset':
                            return datasets[resource.id];
                        case 'layer':
                            return layers[resource.id];
                        case 'widget':
                            return widgets[resource.id];
                        default:
                            logger.warn(`Unexpected collection resource of type ${resource.type}`);
                            return null;

                    }
                });

                return collection;
            });

        }
        return collections;
    }

    static getFilteredQuery(query, user) {
        const application = query.application || query.app || 'rw';

        const filters = {
            ownerId: query.ownerId || user.id,
            application,
            env: query.env ? query.env : 'production'
        };

        Object.keys(query).forEach((param) => {
            if (Object.keys(Collection.schema.paths).includes(param) && param !== 'env') {
                switch (Collection.schema.paths[param].instance) {

                    case 'String':
                        filters[param] = {
                            $regex: query[param],
                            $options: 'i'
                        };
                        break;
                    case 'Array':
                        if (query[param].indexOf('@') >= 0) {
                            filters[param] = {
                                $all: query[param].split('@').map((elem) => elem.trim())
                            };
                        } else {
                            filters[param] = {
                                $in: query[param].split(',').map((elem) => elem.trim())
                            };
                        }
                        break;
                    case 'Mixed':
                        filters[param] = { $ne: null };
                        break;
                    default:
                        break;

                }
            } else if (param === 'env') {
                if (query[param] === 'all') {
                    logger.debug('Applying all environments filter');
                    delete filters.env;
                } else {
                    filters[param] = {
                        $in: query[param].split(',')
                    };
                }
            }
        });

        if (query.application === 'all') {
            delete filters.application;
        }

        logger.info(filters);
        return filters;
    }

    static getFilteredSort(sort) {
        const sortParams = sort.split(',');
        const filteredSort = {};
        const areaAttributes = Object.keys(Collection.schema.obj);
        sortParams.forEach((param) => {
            let sign = param.substr(0, 1);
            let signlessParam = param.substr(1);
            if (sign !== '-' && sign !== '+') {
                signlessParam = param;
                sign = '+';
            }
            if (areaAttributes.indexOf(signlessParam) >= 0) {
                filteredSort[signlessParam] = parseInt(sign + 1, 10);
            }
        });
        return filteredSort;
    }

    static async deleteByUserId(ownerId) {
        logger.debug(`[CollectionsService]: Delete collections for user with id:  ${ownerId}`);

        const userCollections = await CollectionService.getAll(null, { ownerId, application: 'all', env: 'all' });

        if (userCollections.docs) {
            // eslint-disable-next-line no-plusplus
            for (let i = 0, { length } = userCollections.docs; i < length; i++) {
                const currentCollection = userCollections.docs[i];
                logger.info(`[DBACCESS-DELETE]: collection.id: ${currentCollection._id}`);
                // eslint-disable-next-line no-await-in-loop
                await currentCollection.remove();
            }
        }
        return userCollections;
    }

}

module.exports = CollectionService;
