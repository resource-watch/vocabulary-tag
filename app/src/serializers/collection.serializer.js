class CollectionSerializer {

    static serializeElement(el) {
        return {
            id: el._id,
            type: 'collection',
            attributes: {
                name: el.name,
                ownerId: el.ownerId,
                application: el.application,
                env: el.env,
                resources: el.resources ? el.resources.map((res) => {
                    const result = {
                        id: res.id,
                        type: res.type
                    };

                    if (res.attributes) {
                        result.attributes = res.attributes;
                    }

                    return result;
                }) : []
            }
        };
    }

    static serialize(data, link = null) {
        const result = {};
        if (data) {
            if (data.docs) {
                while (data.docs.indexOf(undefined) >= 0) {
                    data.docs.splice(data.docs.indexOf(undefined), 1);
                }
                result.data = data.docs.map((el) => CollectionSerializer.serializeElement(el));
            } else if (Array.isArray(data)) {
                result.data = data.map((el) => CollectionSerializer.serializeElement(el));
            } else {
                result.data = CollectionSerializer.serializeElement(data);
            }
        }
        if (link) {
            result.links = {
                self: `${link}page[number]=${data.page}&page[size]=${data.limit}`,
                first: `${link}page[number]=1&page[size]=${data.limit}`,
                last: `${link}page[number]=${data.pages}&page[size]=${data.limit}`,
                prev: `${link}page[number]=${data.page - 1 > 0 ? data.page - 1 : data.page}&page[size]=${data.limit}`,
                next: `${link}page[number]=${data.page + 1 < data.pages ? data.page + 1 : data.pages}&page[size]=${data.limit}`,
            };
            result.meta = {
                'total-pages': data.pages,
                'total-items': data.total,
                size: data.limit
            };
        }
        return result;
    }

}

module.exports = CollectionSerializer;
