MATCH (:Term)-[quad {termType: 'Quad'}]->(:Term)
RETURN count(DISTINCT quad) AS size