# Vocabulary Tag Microservice

This repository implements the Vocabulary Tag services that are available in the Resource Watch API.

If you are looking for the API Doc (Info and Usage) please go to the next link:
[View the documentation for this
API]()(NOT YET)

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
PATCH: /dataset/:dataset/vocabulary/:vocabulary
DELETE: /dataset/:dataset/vocabulary/:vocabulary
```

### Dataset Vocabulary (Other getters)

It's important to notice the provisional path of the endpoint GET: /dataset_/vocabulary
(UNDERSCORE AFTER THE WORD DATASET)

```
GET: /dataset/:dataset/vocabulary
GET: /dataset_/vocabulary
```

### Widget Vocabulary CRUD

```
GET: /dataset/:dataset/widget/:widget/vocabulary/:vocabulary
POST: /dataset/:dataset/widget/:widget/vocabulary/:vocabulary
PATCH: /dataset/:dataset/widget/:widget/vocabulary/:vocabulary
DELETE: /dataset/:dataset/widget/:widget/vocabulary/:vocabulary
```

### Widget Vocabulary (Other getters)

```
GET: /dataset/:dataset/widget/:widget/vocabulary
GET: /dataset/:dataset/widget/vocabulary
```

### Layer Vocabulary CRUD

```
GET: /dataset/:dataset/layer/:layer/vocabulary/:vocabulary
POST: /dataset/:dataset/layer/:layer/vocabulary/:vocabulary
PATCH: /dataset/:dataset/layer/:layer/vocabulary/:vocabulary
DELETE: /dataset/:dataset/layer/:layer/vocabulary/:vocabulary
```

### Widget Vocabulary (Other getters)

```
GET: /dataset/:dataset/layer/:layer/vocabulary
GET: /dataset/:dataset/layer/vocabulary
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
GET: /dataset_/vocabulary?vocabularyOne=tag1,tag2&vocabularyTwo=tagA,tagB
GET: /dataset/111123/widget/vocabulary?vocabularyOne=tag1,tag2&vocabularyTwo=tagA,tagB
GET: /dataset/111123/layer/vocabulary?vocabularyOne=tag1,tag2&vocabularyTwo=tagA,tagB
```

#### Creating Relationship (Weak Relationship)

```
POST: /dataset/111123/vocabulary/vocabularyName -> payload: {"tags": ["tag1", "tag2", "tag3"]}
POST: /dataset/111123/widget/134599/vocabulary/vocabularyName -> payload: {"tags": ["tag1", "tag2", "tag3"]}
POST: /dataset/111123/layer/134599/vocabulary/vocabularyName -> payload: {"tags": ["tag1", "tag2", "tag3"]}
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

Ir order to contribute to this repo:

1. [Getting Started](#getting-started)
2. [Deployment](#deployment)

## Getting Started

### OS X

**First, make sure that you have the [API gateway running
locally](https://github.com/control-tower/control-tower).**

We're using Docker which, luckily for you, means that getting the
application running locally should be fairly painless. First, make sure
that you have [Docker Compose](https://docs.docker.com/compose/install/)
installed on your machine.

If you've not used Docker before, you may need to set up some defaults:

```
docker-machine create --driver virtualbox default
docker-machine start default
eval $(docker-machine env default)
```

You also need to configure an alias for your local machine:

Get your local IP:

```
ifconfig
```

Modify the /etc/hosts config file adding a new rule:
<your ip> mymachine
```
vim /etc/hosts
```

Now we're ready to actually get the application running:

```
git clone https://github.com/resource-watch/vocabulary-tag
cd vocabulary-tag
./vocabulary.sh develop
```

You can now access the microservice through the API gateway.

## Deployment

In progress...
