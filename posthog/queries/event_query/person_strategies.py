from abc import ABC, abstractmethod
from dataclasses import dataclass

from posthog.queries.person_distinct_id_query import get_team_distinct_ids_query


class EventsQueryPersonStrategy(ABC):
    @abstractmethod
    def get_person_id_column(self) -> str:
        raise NotImplementedError

    def get_person_id_join_clause(self) -> str:
        raise NotImplementedError


@dataclass
class JoinOnPersonDistinctIdStrategy(EventsQueryPersonStrategy):
    event_table_alias: str
    distinct_id_table_alias: str

    def get_person_id_column(self) -> str:
        return f"{self.distinct_id_table_alias}.person_id"

    def get_person_id_join_clause(self) -> str:
        # XXX: `relevant_events_conditions` not in scope, used
        return f"""
            INNER JOIN (
                {get_team_distinct_ids_query(relevant_events_conditions=relevant_events_conditions)}
            ) AS {self.distinct_id_table_alias}
            ON {self.event_table_alias}.distinct_id = {self.distinct_id_table_alias}.distinct_id
        """


@dataclass
class PersonOverridesStrategy(EventsQueryPersonStrategy):
    event_table_alias: str
    person_overrides_table_alias: str = "overrides"

    def get_person_id_column(self) -> str:
        return f"if(notEmpty({self.person_overrides_table_alias}.person_id), {self.person_overrides_table_alias}.person_id, {self.event_table_alias}.person_id)"

    def get_person_id_join_clause(self) -> str:
        return f"""\
            LEFT OUTER JOIN (
                SELECT
                    argMax(override_person_id, version) as person_id,
                    old_person_id
                FROM person_overrides
                WHERE team_id = %(team_id)s
                GROUP BY old_person_id
            ) AS {self.person_overrides_table_alias}
            ON {self.event_table_alias}.person_id = {self.person_overrides_table_alias}.old_person_id
        """
