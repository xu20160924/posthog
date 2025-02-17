from unittest.mock import patch

from rest_framework.exceptions import ValidationError

from ee.hogai.query_executor.nodes import QueryExecutorNode
from ee.hogai.utils.types import AssistantState
from posthog.api.services.query import process_query_dict
from posthog.schema import (
    AssistantTrendsEventsNode,
    AssistantTrendsQuery,
    HumanMessage,
    QueryStatus,
    VisualizationMessage,
)
from posthog.test.base import BaseTest, ClickhouseTestMixin


class TestQueryExecutorNode(ClickhouseTestMixin, BaseTest):
    maxDiff = None

    @patch("ee.hogai.query_executor.nodes.process_query_dict", side_effect=process_query_dict)
    def test_node_runs(self, mock_process_query_dict):
        node = QueryExecutorNode(self.team)
        new_state = node.run(
            AssistantState(
                messages=[
                    HumanMessage(content="Text", id="test"),
                    VisualizationMessage(
                        answer=AssistantTrendsQuery(series=[AssistantTrendsEventsNode()]),
                        plan="Plan",
                        id="test2",
                        initiator="test",
                    ),
                ],
                plan="Plan",
                start_id="test",
            ),
            {},
        )
        mock_process_query_dict.assert_called_once()  # Query processing started
        msg = new_state.messages[0]
        self.assertIn(
            "Here is the results table of the TrendsQuery I created to answer your latest question:", msg.content
        )
        self.assertEqual(msg.type, "ai")
        self.assertIsNotNone(msg.id)

    @patch(
        "ee.hogai.query_executor.nodes.process_query_dict",
        side_effect=ValueError("You have not glibbled the glorp before running this."),
    )
    def test_node_handles_internal_error(self, mock_process_query_dict):
        node = QueryExecutorNode(self.team)
        new_state = node.run(
            AssistantState(
                messages=[
                    HumanMessage(content="Text", id="test"),
                    VisualizationMessage(
                        answer=AssistantTrendsQuery(series=[AssistantTrendsEventsNode()]),
                        plan="Plan",
                        id="test2",
                        initiator="test",
                    ),
                ],
                plan="Plan",
                start_id="test",
            ),
            {},
        )
        mock_process_query_dict.assert_called_once()  # Query processing started
        msg = new_state.messages[0]
        self.assertEqual(msg.content, "There was an unknown error running this query.")
        self.assertEqual(msg.type, "ai/failure")
        self.assertIsNotNone(msg.id)

    @patch(
        "ee.hogai.query_executor.nodes.process_query_dict",
        side_effect=ValidationError(
            "This query exceeds the capabilities of our picolator. Try de-brolling its flim-flam."
        ),
    )
    def test_node_handles_exposed_error(self, mock_process_query_dict):
        node = QueryExecutorNode(self.team)
        new_state = node.run(
            AssistantState(
                messages=[
                    HumanMessage(content="Text", id="test"),
                    VisualizationMessage(
                        answer=AssistantTrendsQuery(series=[AssistantTrendsEventsNode()]),
                        plan="Plan",
                        id="test2",
                        initiator="test",
                    ),
                ],
                plan="Plan",
                start_id="test",
            ),
            {},
        )
        mock_process_query_dict.assert_called_once()  # Query processing started
        msg = new_state.messages[0]
        self.assertEqual(
            msg.content,
            "There was an error running this query: This query exceeds the capabilities of our picolator. Try de-brolling its flim-flam.",
        )
        self.assertEqual(msg.type, "ai/failure")
        self.assertIsNotNone(msg.id)

    def test_node_requires_a_viz_message_in_state(self):
        node = QueryExecutorNode(self.team)

        with self.assertRaisesMessage(
            ValueError, "Can only run summarization with a visualization message as the last one in the state"
        ):
            node.run(
                AssistantState(
                    messages=[
                        HumanMessage(content="Text"),
                    ],
                    plan="Plan",
                    start_id="test",
                ),
                {},
            )

    def test_node_requires_viz_message_in_state_to_have_query(self):
        node = QueryExecutorNode(self.team)

        with self.assertRaisesMessage(ValueError, "Did not find query in the visualization message"):
            node.run(
                AssistantState(
                    messages=[
                        VisualizationMessage(answer=None, plan="Plan", id="test"),
                    ],
                    plan="Plan",
                    start_id="test",
                ),
                {},
            )

    def test_fallback_to_json(self):
        node = QueryExecutorNode(self.team)
        with patch("ee.hogai.query_executor.nodes.process_query_dict") as mock_process_query_dict:
            mock_process_query_dict.return_value = QueryStatus(
                id="test", team_id=self.team.pk, query_async=True, complete=True, results=[{"test": "test"}]
            )

            new_state = node.run(
                AssistantState(
                    messages=[
                        HumanMessage(content="Text", id="test"),
                        VisualizationMessage(
                            answer=AssistantTrendsQuery(series=[AssistantTrendsEventsNode()]),
                            plan="Plan",
                            id="test2",
                            initiator="test",
                        ),
                    ],
                    plan="Plan",
                    start_id="test",
                ),
                {},
            )
            mock_process_query_dict.assert_called_once()  # Query processing started
            msg = new_state.messages[0]
            self.assertIn(
                "Here is the results table of the TrendsQuery I created to answer your latest question:", msg.content
            )
            self.assertEqual(msg.type, "ai")
            self.assertIsNotNone(msg.id)
