## 24/08/2021

- Add support for filtering by env when loading data by vocabularies

## 25/07/2021

- Update `rw-api-microservice-node` to remove CT support.
- Add `env` support to collections.

## 09/06/2021

- Add support for hosts from `x-rw-domain` header when generating pagination links.

## 31/05/2021

- Update `rw-api-microservice-node` to add CORS support.

## 21/05/2021

- Add support for hosts from `referer` header when generating pagination links.

## 25/02/2021

- Fix issue in finding resources by vocabulary and tag value while anonymous.

## 22/02/2021

- Update `rw-api-microservice-node` to fix issue with Fastly headers.

## 12/02/2021

- Remove dependency on CT's `authenticated` functionality

## 14/01/2021

- Replace CT integration library

## 20/11/2020

- Add sorting support to the GET collection endpoint.

# v2.2.0

## 17/11/2020

- Fix `include` param for GET collection endpoint.
- Add pagination to the GET collection endpoint.


# v2.1.0

## 07/09/2020

- Add filter by application to collection find-by-ids endpoint.

# v1.0.2

## 08/04/2020

- Update k8s configuration with node affinity.

# v1.0.1

## 29/01/2020

- Add validation and tests to find collection by id endpoint.

# v1.0.0

## 14/01/2020

- Maintenance tasks and update service dependencies to more recent versions.

# Previous

- Update node version to 12.
- Replace npm with yarn.
- Add liveliness and readiness probes.
- Add resource quota definition for kubernetes.
- Add tests for ensuring the correct management of dataset tags (related to <https://www.pivotaltracker.com/n/projects/1883443/stories/169420749).>
