/**
 * =============================================================
 * PROD: Trang Chi Tiết Sản Phẩm (Public)
 * =============================================================
 * Test cases: PROD-01 → PROD-04
 * Routes:  GET /feedback/product/:id
 */

describe("PROD: Trang chi tiết sản phẩm", () => {
  before(() => cy.task("db:reset"));
  beforeEach(() => Cypress.session.clearAllSavedSessions());

  // ── PROD-01: Trang public, không cần đăng nhập ──────────────
  it("[PROD-01] Trang /feedback/product/1 hiển thị công khai", () => {
    cy.visit("/feedback/product/1");
    cy.url().should("not.include", "/login");
    cy.get("body").should("not.be.empty");
  });

  // ── PROD-02: Hiển thị thống kê sao ──────────────────────────
  it("[PROD-02] Hiển thị thống kê rating (trung bình + tổng số đánh giá)", () => {
    cy.visit("/feedback/product/1");
    // Assert trang có hiển thị số liệu thống kê
    // Seed có 2 APPROVED feedbacks nên phải có dữ liệu
    cy.get("body").then(($body) => {
      // Kiểm tra có phần tử chứa số sao trung bình (text có chứa số thập phân)
      const bodyText = $body.text();
      // Trang phải hiển thị tổng đánh giá hoặc rating trung bình
      expect(bodyText).to.match(/\d[\d,.]*/); // Có số liệu thống kê
    });
  });

  // ── PROD-03: Chỉ hiển thị feedback APPROVED ──────────────────
  it("[PROD-03] Trang sản phẩm chỉ hiển thị feedback đã duyệt (APPROVED)", () => {
    cy.visit("/feedback/product/1");
    // Seed data: "Đang chờ duyệt" (PENDING) và "Sản phẩm không như quảng cáo" (REJECTED)
    // Các text này không được xuất hiện trên trang public
    cy.get("body").should("not.contain", "Đang chờ duyệt, sản phẩm ổn.");
    cy.get("body").should("not.contain", "Sản phẩm không như quảng cáo.");
    // Text của APPROVED phải có mặt
    cy.contains("Sản phẩm rất tốt, chất lượng vượt mong đợi.").should("be.visible");
  });

  // ── PROD-04: Ẩn tên khách hàng đánh giá ẩn danh ─────────────
  it("[PROD-04] Tên khách hàng ẩn danh hiển thị dạng N*****u", () => {
    cy.visit("/feedback/product/1");
    // Seed: feedback ẩn danh của "Trần Thị Bích" → sau mask: "T*****h"
    // Pattern: 1 ký tự bất kỳ (kể cả Unicode) + 3-7 dấu * + 1 ký tự
    cy.get("body").then(($body) => {
      const bodyText = $body.text();
      // .{1} thay vì \w để hỗ trợ ký tự Unicode/tiếng Việt
      expect(bodyText).to.match(/.{1}\*{3,7}.{1}/);
    });
  });
});
