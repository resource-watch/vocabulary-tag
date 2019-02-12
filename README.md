# Vocabulary Tag Microservice

This repository implements the Vocabulary Tag services that are available in the Resource Watch API.

The Vocabulary microservice is built using [Node.js](https://nodejs.org/en/), and can be executed either natively or using Docker, each of which has its own set of requirements.

Native execution requires:
- [Node.js](https://nodejs.org/en/)
- [MongoDB](https://www.mongodb.com/)

Execution using Docker requires:
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

## Getting started

Start by cloning the repository from github to your execution environment

```
git clone https://github.com/resource-watch/vocabulary-tag.git && cd vocabulary
```

After that, follow one of the instructions below:

### Using native execution

1 - Set up your environment variables. See `dev.env.sample` for a list of variables you should set, which are described in detail in [this section](#configuration-environment-variables) of the documentation. Native execution will NOT load the `dev.env` file content, so you need to use another way to define those values

2 - Install node dependencies using NPM:
```
npm install
```

3 - Start the application server:
```
npm start
```

The endpoints provided by this microservice should now be available through Control Tower's URL.

### Using Docker

1 - Create and complete your `dev.env` file with your configuration. The meaning of the variables is available in this [section](#configuration-environment-variables). You can find an example `dev.env.sample` file in the project root.

2 - Execute the following command to run Control tower:

```
./vocabulary.sh develop
```

The endpoints provided by this microservice should now be available through Control Tower's URL.

## Testing

There are two ways to run the included tests:

### Using native execution

Follow the instruction above for setting up the runtime environment for native execution, then run:
```
npm test
```

### Using Docker

Follow the instruction above for setting up the runtime environment for Docker execution, then run:
```
./vocabulary.sh test
```

## Configuration

### Environment variables

- PORT => TCP port in which the service will run
- NODE_PATH => relative path to the source code. Should be `app/src`
- CT_REGISTER_MODE => if `auto` the microservice automatically registers on Control Tower on start
- CT_TOKEN => 
- API_VERSION => API version identifier that prefixes the URL. Should be `v1`
- S3_ACCESS_KEY_ID => AWS S3 key id
- S3_SECRET_ACCESS_KEY => AWS S3 access key
- STAMPERY_TOKEN => Stampery token
- MONGO_PORT_27017_TCP_ADDR => IP/Address of the MongoDB server

You can optionally set other variables, see [this file](config/custom-environment-variables.json) for an extended list.

## Documentation

## Quick Overview

### Vocabulary Entity

```
name: <String>, required
resources: <Array:Object>
    id: <String>
    dataset: <String>
    type <String>, [dataset, widget, layer]
    tags: <Array:String>
```

### Dataset Vocabulary CRUD

```
GET: /dataset/:dataset/vocabulary/:vocabulary
POST: /dataset/:dataset/vocabulary/:vocabulary
POST: /dataset/:dataset/vocabulary
PATCH: /dataset/:dataset/vocabulary/:vocabulary
DELETE: /dataset/:dataset/vocabulary/:vocabulary
DELETE: /dataset/:dataset/vocabulary
```

### Dataset Vocabulary (Other getters)


```
GET: /dataset/:dataset/vocabulary
GET: /dataset/vocabulary/find
```

### Widget Vocabulary CRUD

```
GET: /dataset/:dataset/widget/:widget/vocabulary/:vocabulary
POST: /dataset/:dataset/widget/:widget/vocabulary/:vocabulary
POST: /dataset/:dataset/widget/:widget/vocabulary
PATCH: /dataset/:dataset/widget/:widget/vocabulary/:vocabulary
DELETE: /dataset/:dataset/widget/:widget/vocabulary/:vocabulary
DELETE: /dataset/:dataset/widget/:widget/vocabulary
```

### Widget Vocabulary (Other getters)

```
GET: /dataset/:dataset/widget/:widget/vocabulary
GET: /dataset/:dataset/widget/vocabulary/find
```

### Layer Vocabulary CRUD

```
GET: /dataset/:dataset/layer/:layer/vocabulary/:vocabulary
POST: /dataset/:dataset/layer/:layer/vocabulary/:vocabulary
POST: /dataset/:dataset/layer/:layer/vocabulary
PATCH: /dataset/:dataset/layer/:layer/vocabulary/:vocabulary
DELETE: /dataset/:dataset/layer/:layer/vocabulary/:vocabulary
DELETE: /dataset/:dataset/layer/:layer/vocabulary
```

### Widget Vocabulary (Other getters)

```
GET: /dataset/:dataset/layer/:layer/vocabulary
GET: /dataset/:dataset/layer/vocabulary/find
```

### Vocabulary CRUD

```
GET: /vocabulary/:vocabulary
POST: /vocabulary/:vocabulary
PATCH: /vocabulary/:vocabulary
DELETE: /vocabulary/:vocabulary
```

### Vocabulary GetAll

```
GET: /vocabulary
```

### Finding By Ids

```
POST: /dataset/vocabulary/find-by-ids
POST: /dataset/:dataset/widget/vocabulary/find-by-ids
POST: /dataset/:dataset/layer/vocabulary/find-by-ids
```

### POST, PATCH, DELETE

Auth required:

- Generic USERs are forbidden
- A MANAGER is allowed if it's the owner of the resource
- ADMINs and SUPERADMINs are allowed

### CRUD Examples

#### Getting

```
// By resource and vocabulary 
GET: /dataset/111123/vocabulary/vocabularyName
GET: /dataset/111123/widget/134599/vocabulary/vocabularyName
GET: /dataset/111123/layer/134599/vocabulary/vocabularyName

// All vocabularies by resource
GET: /dataset/111123/vocabulary
GET: /dataset/111123/widget/134599/vocabulary
GET: /dataset/111123/layer/134599/vocabulary

// All resources by resource type and vocabulary-tag
GET: /dataset/vocabulary/find?vocabularyOne=tag1,tag2&vocabularyTwo=tagA,tagB
GET: /dataset/111123/widget/vocabulary/find?vocabularyOne=tag1,tag2&vocabularyTwo=tagA,tagB
GET: /dataset/111123/layer/vocabularyfind?vocabularyOne=tag1,tag2&vocabularyTwo=tagA,tagB
```

#### Creating Relationship (Weak Relationship)

```
POST: /dataset/111123/vocabulary/vocabularyName -> payload: {"tags": ["tag1", "tag2", "tag3"]}
POST: /dataset/111123/widget/134599/vocabulary/vocabularyName -> payload: {"tags": ["tag1", "tag2", "tag3"]}
POST: /dataset/111123/layer/134599/vocabulary/vocabularyName -> payload: {"tags": ["tag1", "tag2", "tag3"]}
```

#### Creating Several Relationships (Weak Relationship)

```
POST: /dataset/111123/vocabulary -> payload: {"vocabularyNameOne": {"tags": ["tag1", "tag2", "tag3"]}, "vocabularyNameTwo": {"tags": ["tag1", "tag2", "tag3"]}}
POST: /dataset/111123/widget/134599/vocabulary -> payload: {"vocabularyNameOne": {"tags": ["tag1", "tag2", "tag3"]}, "vocabularyNameTwo": {"tags": ["tag1", "tag2", "tag3"]}}
POST: /dataset/111123/layer/134599/vocabulary -> payload: {"vocabularyNameOne": {"tags": ["tag1", "tag2", "tag3"]}, "vocabularyNameTwo": {"tags": ["tag1", "tag2", "tag3"]}}
```

#### Updating (partial)

```
PATCH: /dataset/111123/vocabulary/vocabularyName -> payload: {"tags": ["tagA"]}
PATCH: /dataset/111123/widget/134599/vocabulary/vocabularyName -> payload: {"tags": ["tagX", "tagY"]}
PATCH: /dataset/111123/layer/134599/vocabulary/vocabularyName -> payload: {"tags": ["tag10", "tag20", "tag30"]}
```

#### Deleting

```
DELETE: /dataset/111123/vocabulary/vocabularyName
DELETE: /dataset/111123/widget/134599/vocabulary/vocabularyName
DELETE: /dataset/111123/layer/134599/vocabulary/vocabularyName
```

#### Vocabulary Entity (Get, GetAll, Creation)

```
GET: /vocabulary/vocabularyName
GET: /vocabulary/vocabularyName
POST: /vocabulary/vocabularyName -> payload: {"name": "vocabularyName"}
```

#### Getting All

```
GET: /vocabulary
```

#### Vocabulary Entity (Update, Delete) (THEY VALIDATE CONSISTENCY - ONLY FOR SUPERADMINS)

```
PATCH: /vocabulary/vocabularyName -> payload: {"name": "vocabularyName"}
DELETE: /vocabulary/vocabularyName
```

#### Getting All

```
GET: /vocabulary
```

#### Finding By Ids

"ids" property is required in the payload, in other case the endpoint responds a 400 HTTP ERROR (Bad Request)
This property can be an Array or a String (comma-separated)
payload -> {"ids": ["112313", "111123"]}
payload -> {"ids": "112313, 111123"}

```
POST: /dataset/vocabulary/find-by-ids -> payload: {"ids": ["112313", "111123"]}
POST: /dataset/:dataset/widget/vocabulary/find-by-ids -> payload: {"ids": ["112313", "111123"]}
POST: /dataset/:dataset/layer/vocabulary/find-by-ids -> payload: {"ids": ["112313", "111123"]}
```
