from abc import ABC, abstractmethod
from dataclasses import dataclass


class EventsQueryPersonStrategy(ABC):
    @abstractmethod
    def get_person_id_column(self) -> str:
        raise NotImplementedError

    def get_person_id_join_clause(self) -> str:
        raise NotImplementedError


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
