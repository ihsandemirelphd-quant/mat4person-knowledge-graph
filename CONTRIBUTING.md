# Contributing a relation

MAT4Person is evidence-first: every relation in the atlas has a source, a page (when there is one), and an exact quote. If you know of a documented relation that's missing, you can suggest it.

## How to submit

1. Click **"+ Suggest a relation"** on any page of the site, or [open a new issue directly](https://github.com/ihsandemirelphd-quant/mat4person-knowledge-graph/issues/new?template=suggest-relation.yml).
2. Fill in the two people (or the person and the institute/event), the relation type, and — most importantly — the **exact quote** from a real source, with the document name and page number.
3. Submit. Your issue is labeled `needs-review`.

## How submissions are reviewed

- Every submission is checked against its cited source before being accepted. Quotes that can't be verified, or that are paraphrased rather than exact, are labeled `needs-more-evidence` and the issue stays open for a follow-up.
- Accepted relations are labeled `accepted`, transcribed into the underlying dataset with `review_status: community_submitted`, and folded into the next site rebuild. The issue is closed with a link to the commit and the live page once it's up.
- Relations that are already documented are labeled `duplicate` and closed with a pointer to the existing entry.

## What makes a good submission

- The quote should be **word-for-word** from the source, not a paraphrase.
- Cite the actual document — a filename, a book or article title, or a link — and a page number if there is one.
- One relation per issue, so each can be reviewed independently.
- Names don't need to be exact node IDs — just use the name as commonly written; the reviewer will match it to the right entry (or ask if it's ambiguous).

Thank you for helping make this atlas more complete.
