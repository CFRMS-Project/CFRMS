/**
 * =============================================================
 * ADM-FILTER: Admin Filter & Tìm Kiếm Feedback
 * =============================================================
 * Test cases: ADM-FILTER-01 → ADM-FILTER-05
 * Routes:  GET /admin/feedbacks?q=...&tab=...&sort=...
 */

describe("ADM-FILTER: Admin tìm kiếm và lọc feedback", () => {
  before(() => cy.task("db:reset"));

  beforeEach(() => {
    cy.loginAsAdmin();
  });

  // ── ADM-FILTER-01: Tìm kiếm theo keyword ────────────────────
  it("[ADM-FILTER-01] Tìm kiếm theo keyword → URL có ?q=<keyword>", () => {
    const keyword = "tốt";
    cy.visit("/admin/feedbacks");

    // Tìm ô search và nhập keyword
    cy.get("input[name='q'], input[type='search'], input[placeholder*='Tìm']")
      .first()
      .type(keyword);

    // Submit form tìm kiếm
    cy.get("form").first().submit();

    cy.url().should("include", `q=${encodeURIComponent(keyword)}`);
  });

  // ── ADM-FILTER-02: Keyword không tồn tại → bảng trống ────────
  it("[ADM-FILTER-02] Keyword không tồn tại → bảng không có kết quả", () => {
    const keyword = "xxxxnotexistxxx";
    cy.visit(`/admin/feedbacks?q=${keyword}&tab=all`);
    cy.url().should("include", `q=${keyword}`);
    // Bảng trống hoặc có thông báo không có dữ liệu
    cy.get("body").then(($body) => {
      const bodyText = $body.text();
      const hasNoData =
        bodyText.includes("Không có") ||
        bodyText.includes("không có kết quả") ||
        bodyText.includes("No data") ||
        $body.find("table tbody tr").length === 0 ||
        $body.find("[data-empty]").length > 0;
      expect(hasNoData).to.be.true;
    });
  });

  // ── ADM-FILTER-03: Sắp xếp tăng dần ────────────────────────
  it("[ADM-FILTER-03] Sắp xếp sort=asc → URL có ?sort=asc", () => {
    cy.visit("/admin/feedbacks?tab=all&sort=asc");
    cy.url().should("include", "sort=asc");
    // Trang không crash
    cy.get("body").should("not.be.empty");
  });

  // ── ADM-FILTER-04: Sắp xếp giảm dần ────────────────────────
  it("[ADM-FILTER-04] Sắp xếp sort=desc → URL có ?sort=desc", () => {
    cy.visit("/admin/feedbacks?tab=all&sort=desc");
    cy.url().should("include", "sort=desc");
    cy.get("body").should("not.be.empty");
  });

  // ── ADM-FILTER-05: Kết hợp tab + keyword + sort ──────────────
  it("[ADM-FILTER-05] Kết hợp tab=approved&q=tốt&sort=asc → không crash", () => {
    cy.visit("/admin/feedbacks?tab=approved&q=t%E1%BB%91t&sort=asc");
    cy.url().should("include", "tab=approved");
    cy.url().should("include", "sort=asc");
    // Trang render được (không có lỗi 500)
    cy.get("body").should("not.be.empty");
    cy.get("body").should("not.contain", "Lỗi máy chủ");
  });
});
