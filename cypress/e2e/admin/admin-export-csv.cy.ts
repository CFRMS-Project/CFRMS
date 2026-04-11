/**
 * =============================================================
 * ADM-CSV: Admin Xuất Báo Cáo CSV
 * =============================================================
 * Test cases: ADM-CSV-01 → ADM-CSV-04
 * Routes:
 *   GET /admin/feedbacks/export?tab=...&q=...&sort=...
 *   GET /admin/dashboard/export-csv
 */

describe("ADM-CSV: Admin xuất báo cáo CSV", () => {
  before(() => cy.task("db:reset"));

  beforeEach(() => {
    cy.loginAsAdmin();
  });

  // ── ADM-CSV-01: Xuất CSV tất cả feedback ────────────────────
  it("[ADM-CSV-01] Export tất cả feedback → Content-Type text/csv + attachment", () => {
    cy.request({
      url: "/admin/feedbacks/export",
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers["content-type"]).to.include("text/csv");
      expect(response.headers["content-disposition"]).to.include("attachment");
    });
  });

  // ── ADM-CSV-02: Xuất CSV với filter tab=approved ─────────────
  it("[ADM-CSV-02] Export với tab=approved → trả về file CSV hợp lệ", () => {
    cy.request({
      url: "/admin/feedbacks/export?tab=approved",
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers["content-type"]).to.include("text/csv");
      // Body là text CSV có ít nhất header row
      const body = response.body as string;
      expect(body).to.include("ID");
      expect(body).to.include("Khách hàng");
    });
  });

  // ── ADM-CSV-03: Tên file CSV đúng định dạng ──────────────────
  it("[ADM-CSV-03] Tên file CSV theo định dạng danh-gia-{tab}-YYYY-MM-DD.csv", () => {
    cy.request({
      url: "/admin/feedbacks/export?tab=pending",
    }).then((response) => {
      const disposition = response.headers["content-disposition"] as string;
      // Assert pattern: danh-gia-pending-2024-01-01.csv
      expect(disposition).to.match(
        /danh-gia-(pending|approved|rejected|all)-\d{4}-\d{2}-\d{2}\.csv/
      );
    });
  });

  // ── ADM-CSV-04: Export CSV Dashboard ────────────────────────
  it("[ADM-CSV-04] Export CSV từ /admin/dashboard/export-csv → Content-Type text/csv", () => {
    cy.request({
      url: "/admin/dashboard/export-csv",
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers["content-type"]).to.include("text/csv");
      expect(response.headers["content-disposition"]).to.include("attachment");
    });
  });
});
