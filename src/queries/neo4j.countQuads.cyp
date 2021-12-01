MATCH (:Term)-[quad]->(:Term)
RETURN count(DISTINCT quad) AS count
