/**
 * =============================================================
 * ADM-DASH: Admin Dashboard
 * =============================================================
 * Test cases: ADM-DASH-01 → ADM-DASH-03
 * Routes:
 *   GET /admin/dashboard
 *   GET /admin/dashboard/export-csv
 */

describe("ADM-DASH: Admin Dashboard", () => {
  before(() => cy.task("db:reset"));

  // ── ADM-DASH-01: Redirect nếu chưa login ────────────────────
  it("[ADM-DASH-01] /admin/dashboard chưa login → redirect", () => {
    Cypress.session.clearAllSavedSessions();
    cy.visit("/admin/dashboard", { failOnStatusCode: false });
    cy.url().should("match", /\/(admin\/login|login)/);
  });

  // ── ADM-DASH-02: Admin thấy dashboard với thống kê ───────────
  it("[ADM-DASH-02] Admin thấy dashboard với các widget thống kê", () => {
    cy.loginAsAdmin();
    cy.visit("/admin/dashboard");
    cy.url().should("include", "/admin/dashboard");
    // Trang dashboard phải có nội dung
    cy.get("body").should("not.be.empty");
    // Assert có các số liệu (seed có 5 feedbacks với các trạng thái khác nhau)
    cy.get("body").then(($body) => {
      const bodyText = $body.text();
      // Dashboard phải hiển thị con số nào đó
      expect(bodyText).to.match(/\d+/);
    });
  });

  // ── ADM-DASH-03: Xuất CSV báo cáo từ dashboard ───────────────
  it("[ADM-DASH-03] Xuất CSV từ dashboard → response có header đúng", () => {
    cy.loginAsAdmin();
    cy.request({
      url: "/admin/dashboard/export-csv",
      encoding: "binary",
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers["content-type"]).to.include("text/csv");
      expect(response.headers["content-disposition"]).to.include("attachment");
    });
  });
});
