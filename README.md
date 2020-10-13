# Tracking COVID-19’s Effects by Race and Ethnicity
 
This repository contains the code and data needed to generate the charts found in the [Tracking COVID-19’s Effects by Race and Ethnicity](https://www.urban.org/features/tracking-covid-19s-effects-race-and-ethnicity) feature. The charts use the outputs of the code from [this repo](https://github.com/UrbanInstitute/pulse_survey_race_dashboard) which calculates two-week rolling average point estimates along with margins of errors for nine different indicators measured in the [Household Pulse Survey](https://www.census.gov/householdpulsedata) by race/ethnicity for the US, all 50 states and DC, and 15 CBSAs.

## How to update
The latest version of the data can be found [here](https://ui-census-pulse-survey.s3.amazonaws.com/rolling_all_to_current_week.csv). It should be downloaded to the `data/` directory.

The mapping of CBSA names from the full names used in the data file to the shortened versions displayed in the UI can be found [here](https://ui-census-pulse-survey.s3.amazonaws.com/msa_translation_list.csv).
