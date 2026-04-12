/**
 * =============================================================
 * ADM-ACT: Admin Actions – Duyệt, Từ Chối, Xóa Feedback
 * =============================================================
 * Test cases: ADM-ACT-01 → ADM-ACT-08
 * Routes:
 *   PATCH  /admin/feedbacks/change-status/:status/:id
 *   PATCH  /admin/feedbacks/change-multi
 *   DELETE /admin/feedbacks/delete/:id
 */

describe("ADM-ACT: Admin actions trên feedback", () => {
  // Reset DB trước mỗi test vì các action thay đổi state
  beforeEach(() => {
    cy.task("db:reset");
    Cypress.session.clearAllSavedSessions();
    cy.loginAsAdmin();
  });

  // ── ADM-ACT-01: APPROVE một feedback ────────────────────────
  it("[ADM-ACT-01] APPROVE feedback → response code 200", () => {
    cy.fixture("seed-data").then((seedData) => {
      const id = seedData.feedbacks.pendingId; // PENDING → APPROVED
      cy.request({
        method: "PATCH",
        url: `/admin/feedbacks/change-status/approved/${id}`,
        body: {},
        headers: { "Content-Type": "application/json" },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.code).to.eq(200);
        expect(response.body.message).to.include("thành công");
      });
    });
  });

  // ── ADM-ACT-02: REJECT feedback kèm reply ────────────────────
  it("[ADM-ACT-02] REJECT feedback với reply lý do → response code 200", () => {
    cy.fixture("seed-data").then((seedData) => {
      const id = seedData.feedbacks.pendingId;
      cy.request({
        method: "PATCH",
        url: `/admin/feedbacks/change-status/rejected/${id}`,
        body: { reply: "Nội dung vi phạm quy định cộng đồng." },
        headers: { "Content-Type": "application/json" },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.code).to.eq(200);
      });
    });
  });

  // ── ADM-ACT-03: changeMulti – APPROVE nhiều feedback ─────────
  it("[ADM-ACT-03] changeMulti action=approve → response code 200", () => {
    cy.fixture("seed-data").then((seedData) => {
      cy.request({
        method: "PATCH",
        url: "/admin/feedbacks/change-multi",
        body: {
          action: "approve",
          ids: [seedData.feedbacks.pendingId, seedData.feedbacks.rejectedId],
        },
        headers: { "Content-Type": "application/json" },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.code).to.eq(200);
      });
    });
  });

  // ── ADM-ACT-04: changeMulti – DELETE nhiều feedback ──────────
  it("[ADM-ACT-04] changeMulti action=delete → response code 200", () => {
    cy.fixture("seed-data").then((seedData) => {
      cy.request({
        method: "PATCH",
        url: "/admin/feedbacks/change-multi",
        body: {
          action: "delete",
          ids: [seedData.feedbacks.pendingId],
        },
        headers: { "Content-Type": "application/json" },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.code).to.eq(200);
      });
    });
  });

  // ── ADM-ACT-05: changeMulti – action không hợp lệ → 400 ─────
  it("[ADM-ACT-05] changeMulti action không hợp lệ → code 400", () => {
    cy.fixture("seed-data").then((seedData) => {
      cy.request({
        method: "PATCH",
        url: "/admin/feedbacks/change-multi",
        body: {
          action: "invalid_action",
          ids: [seedData.feedbacks.pendingId],
        },
        headers: { "Content-Type": "application/json" },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.code).to.eq(400);
      });
    });
  });

  // ── ADM-ACT-06: Xóa mềm một feedback ────────────────────────
  it("[ADM-ACT-06] DELETE /admin/feedbacks/delete/:id → code 200", () => {
    cy.fixture("seed-data").then((seedData) => {
      const id = seedData.feedbacks.pendingId;
      cy.request({
        method: "DELETE",
        url: `/admin/feedbacks/delete/${id}`,
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.code).to.eq(200);
        expect(response.body.message).to.include("thành công");
      });
    });
  });

  // ── ADM-ACT-07: Xóa với ID không hợp lệ → 400 ───────────────
  it("[ADM-ACT-07] DELETE ID không hợp lệ (chữ) → code 400", () => {
    cy.request({
      method: "DELETE",
      url: "/admin/feedbacks/delete/abc",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body.code).to.eq(400);
    });
  });

  // ── ADM-ACT-08: PATCH status không hợp lệ → 400 ─────────────
  it("[ADM-ACT-08] PATCH change-status với status không hợp lệ → code 400", () => {
    cy.fixture("seed-data").then((seedData) => {
      const id = seedData.feedbacks.pendingId;
      cy.request({
        method: "PATCH",
        url: `/admin/feedbacks/change-status/unknown_status/${id}`,
        body: {},
        headers: { "Content-Type": "application/json" },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.code).to.eq(400);
      });
    });
  });
});
