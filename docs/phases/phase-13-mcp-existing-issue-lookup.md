# Phase 13: MCP and Jira, Existing Issue Lookup and Smart Updates

## Goal

Before creating a new Jira issue, check whether a similar issue already
exists in the target project. If a strong match is found, offer the
reviewer the option to update the existing issue (append a comment or
update the description with new context from the meeting) instead of
creating a duplicate.

This is the first phase where an actual MCP connection is justified,
since the decision of whether to search, compare, and possibly update an
existing issue is closer to genuine agentic tool use than the earlier
deterministic create flow.

## Before you start

1. Review the JiraService built across Phases 8, 9, and 11 — understand
   exactly how organization-scoped credentials are currently loaded and
   used.
2. Decide, based on what's available at implementation time, whether to
   use Atlassian's official Jira MCP server or continue with direct REST
   API calls wrapped in your own tool definitions. If Anthropic or
   Atlassian MCP tooling has changed since this document was written,
   check current documentation before committing to an approach.
3. Confirm whether your OpenAI usage should switch to a model/flow that
   supports tool calling for this phase, since the existing structured
   output extraction flow used a fixed schema and will now need a
   decision making step. Check current OpenAI documentation for tool
   calling before implementing, this may have changed since original
   integration.

## What to build

### 1. Similar issue search

- Add a method to JiraService (or a new service if using MCP) that runs a
  JQL search scoped to the target project, using key terms from the
  extracted item's title, for example:
  `project = PROJ AND text ~ "login crash safari" AND status != Done`
- Return the top few candidate matches with their key, title, description
  snippet, and status.

### 2. Similarity comparison

- For each candidate, compare it against the extracted item using either:
  - An LLM prompt with both texts, asking for a similarity judgment and a
    short explanation, or
  - Embedding similarity (OpenAI embeddings) with a cosine similarity
    threshold, faster and cheaper if you expect a high volume of
    comparisons.
- Start with the LLM prompt approach for better explanation quality
  during early testing, consider embeddings later if latency or cost
  becomes an issue.

### 3. Extend the ExtractedItem entity and review flow

- Add columns: possible_duplicate_of (nullable, Jira issue key),
  duplicate_confidence (nullable), action_taken (create, update_existing,
  none).
- In the review UI, if a possible duplicate is found, show it alongside
  the draft item with the confidence and explanation, and give the
  reviewer three choices: create as new anyway, update the existing
  issue, or dismiss the draft entirely.

### 4. Update existing issue flow

- If the reviewer chooses update_existing, call the Jira API to add a
  comment to the existing issue with the new context from this meeting
  (link back to which meeting it came from), rather than silently
  overwriting the original description.
- Store the meeting to issue link even when updating rather than
  creating, so your app's history reflects that this meeting contributed
  to that issue.

## Explicitly out of scope for this phase

- Fully autonomous auto merging without any human review, keep a human in
  the loop for this decision given the risk of incorrectly merging two
  unrelated issues.

## Acceptance criteria

- When an extracted item closely matches an existing open Jira issue in
  the target project, the reviewer sees this clearly before approving.
- The reviewer can choose to update the existing issue instead of
  creating a duplicate, and the update appears as a comment on the
  correct Jira issue.
- False positive duplicate suggestions are rare enough not to slow down
  the review workflow, tune the similarity threshold based on real usage
  once this is live.

<!-- ------------------------------------------------------------------------->

Need to extract the sprint if it is mentioned in the meeting. if mentioned need to analyse the
sprint and do the actions as people discussed in the meeting.
Ex:

1. move this authentication task to sprint 23.
2. some modifications in exisiting cards.

## Need benchmarking + Scoring Engine
