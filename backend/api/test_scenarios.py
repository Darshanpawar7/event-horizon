import unittest

from pydantic import ValidationError

import app


class ScenarioNamesTest(unittest.TestCase):
    def test_evidence_states_and_plaza_timelines_are_known(self):
        for name in ("clear", "tracking", "visibility", "camera", "collective", "surge", "crush"):
            self.assertTrue(app.is_known_scenario(name), name)

    def test_venue_timelines_are_known_and_map_to_a_headline_state(self):
        self.assertTrue(app.is_known_scenario("ndls:incident"))
        self.assertEqual(app.base_state("ndls:incident"), app.SCENARIOS["crush"])
        self.assertEqual(app.base_state("itaewon:intervention"), app.SCENARIOS["surge"])

    def test_unknown_names_are_rejected(self):
        for name in ("nope", "ndls:unknown", "NDLS:incident", "a:b:incident", ""):
            self.assertFalse(app.is_known_scenario(name), name)
        with self.assertRaises(ValidationError):
            app.ScenarioRequest(scenario="ndls:unknown")

    def test_observation_names_its_source_after_the_scenario(self):
        with app.state_lock:
            previous = app.runtime["scenario"]
            app.runtime["scenario"] = "sangam:incident"
        try:
            observation = app.observation()
        finally:
            with app.state_lock:
                app.runtime["scenario"] = previous
        self.assertEqual(observation["source_id"], "demo-sangam:incident")
        self.assertEqual(observation["motion_state"], "UNUSUAL COLLECTIVE MOVEMENT")
        self.assertFalse(observation["forecast_available"])


if __name__ == "__main__":
    unittest.main()
