class FavouriteSerializer {

    static serializeElement(el) {
        return {
            id: el._id,
            type: 'favourite',
            attributes: {
                userId: el.userId,
                resourceType: el.resourceType,
                resourceId: el.resourceId,
                createdAt: el.createdAt,
                resource: el.resource,
                application: el.application
            }
        };
    }

    static serialize(data) {
        const result = {};
        if (data) {
            if (Array.isArray(data)) {
                result.data = data.map((el) => FavouriteSerializer.serializeElement(el));
            } else {
                result.data = FavouriteSerializer.serializeElement(data);
            }
        }
        return result;
    }

}

module.exports = FavouriteSerializer;
