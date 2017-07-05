const JSONAPISerializer = require('jsonapi-serializer').Serializer;

const favouriteSerializer = new JSONAPISerializer('favourite', {
    attributes: ['userId', 'resourceType', 'resourceId', 'createdAt'],
    typeForAttribute: function (attribute, record) {
        return attribute;
    },
    keyForAttribute: 'camelCase'
});

class FavouriteSerializer {

    static serialize(data) {
        return favouriteSerializer.serialize(data);
    }
    
}

module.exports = FavouriteSerializer;
