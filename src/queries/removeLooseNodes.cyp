MATCH (node:Term)
WHERE NOT (node)-[]-()
DELETE node
