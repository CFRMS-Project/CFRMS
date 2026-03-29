document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("feedback-detail-modal");
  if (!modal) return;

  let currentFeedbackId = null;

  // Xử lý đóng modal
  const closeBtns = modal.querySelectorAll(".modal-close-btn");
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  });

  // Bấm vào nền tối để đóng
  modal.addEventListener("click", (e) => {
    const modalContent = modal.querySelector(".bg-white");
    if (modalContent && !modalContent.contains(e.target)) {
      modal.classList.add("hidden");
    }
  });

  // 1. Quản lý Checkboxes
  const checkAll = document.querySelector("input[name='checkall']");
  const checkItems = document.querySelectorAll("input[name='id']");

  if (checkAll) {
    checkAll.addEventListener("change", () => {
      checkItems.forEach((cb) => (cb.checked = checkAll.checked));
    });
  }

  checkItems.forEach((cb) => {
    cb.addEventListener("change", () => {
      const allChecked = Array.from(checkItems).every((item) => item.checked);
      if (checkAll) checkAll.checked = allChecked;
    });
  });

  // 2. Chức năng API
  const updateStatus = (id, status, reply = "") => {
    return fetch(`/admin/feedbacks/change-status/${status}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    }).then(res => res.json());
  };

  const updateMulti = (action, ids) => {
    return fetch(`/admin/feedbacks/change-multi`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids })
    }).then(res => res.json());
  };

  // 3. Xử lý các nút trên danh sách
  document.addEventListener("click", (e) => {
    const detailBtn = e.target.closest(".btn-action-detail");
    const approveBtnRow = e.target.closest(".btn-action-approve");
    const rejectBtnRow = e.target.closest(".btn-action-reject");
    const bulkApproveBtn = e.target.closest("#btn-bulk-approve");

    // Xem chi tiết
    if (detailBtn) {
      e.preventDefault();
      const row = detailBtn.closest("tr[data-id]");
      if (row) openFeedbackModal(row.getAttribute("data-id"));
    }

    // Nút Duyệt / Từ chối trên các dòng Pending
    if (approveBtnRow || rejectBtnRow) {
      e.preventDefault();
      const row = (approveBtnRow || rejectBtnRow).closest("tr[data-id]");
      if (!row) return;

      const id = row.getAttribute("data-id");
      const status = approveBtnRow ? 'approved' : 'rejected';
      const actionName = approveBtnRow ? 'Duyệt' : 'Từ chối';

      if (confirm(`Bạn chắc chắn muốn ${actionName.toLowerCase()} đánh giá này?`)) {
        updateStatus(id, status).then(response => {
          if (response.code === 200) {
            window.location.reload();
          } else {
            alert(response.message || "Lỗi cập nhật");
          }
        });
      }
    }

    // Duyệt hàng loạt
    if (bulkApproveBtn) {
      e.preventDefault();
      const checkedIds = Array.from(document.querySelectorAll("input[name='id']:checked")).map(cb => cb.value);
      if (checkedIds.length === 0) {
        alert("Vui lòng chọn ít nhất 1 đánh giá để thao tác.");
        return;
      }

      if (confirm(`Thực hiện duyệt ${checkedIds.length} đánh giá đã chọn?`)) {
        updateMulti('approve', checkedIds).then(response => {
           if (response.code === 200) {
             window.location.reload();
           } else {
             alert(response.message || "Có lỗi xảy ra");
           }
        });
      }
    }
  });

  // 4. Các nút tương tác trong Modal
  const btnApproveModal = document.getElementById("modal-btn-reply");
  const btnHideModal = document.getElementById("modal-btn-hide");
  const replyInput = document.getElementById("modal-reply-input");

  if (btnApproveModal) {
    btnApproveModal.addEventListener("click", () => {
      if (!currentFeedbackId) return;
      const reply = replyInput.value.trim();
      updateStatus(currentFeedbackId, 'approved', reply).then(res => {
         if (res.code === 200) window.location.reload();
         else alert(res.message || "Lỗi");
      });
    });
  }

  if (btnHideModal) {
    btnHideModal.addEventListener("click", () => {
       if (!currentFeedbackId) return;
       updateStatus(currentFeedbackId, 'rejected').then(res => {
         if (res.code === 200) window.location.reload();
         else alert(res.message || "Lỗi");
       });
    });
  }

  // 5. Hàm mở / render Modal
  function openFeedbackModal(id) {
    currentFeedbackId = id; // Lưu ID hiện tại
    fetch(`/admin/feedbacks/detail/${id}`)
      .then((res) => res.json())
      .then((response) => {
        if (response.code === 200) {
          renderModal(response.data);
          modal.classList.remove("hidden");
        } else {
          alert("Lỗi: " + (response.message || "Không tìm thấy"));
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Lỗi kết nối");
      });
  }

  function renderModal(data) {
    // Info
    const name = data.user?.name || data.user?.username || "Ẩn danh";
    document.getElementById("modal-user-name").textContent = name;
    document.getElementById("modal-user-avatar").src =
      data.user?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}`;

    document.getElementById("modal-product-name").textContent = data.product?.name || "Sản phẩm";
    document.getElementById("modal-product-price").textContent = data.product?.fakePrice || "0đ";
    document.getElementById("modal-product-img").src =
      data.user?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=product`;

    // Rating & Date
    const rating = data.rating || 5;
    document.getElementById("modal-rating-score").textContent = rating.toFixed(1);
    const starsContainer = document.getElementById("modal-rating-stars");
    starsContainer.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
        const starColor = i <= rating ? "text-yellow-400" : "text-gray-200";
        starsContainer.insertAdjacentHTML("beforeend", `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ${starColor}" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`);
    }

    const d = new Date(data.createdAt);
    document.getElementById("modal-date").textContent = `ĐĂNG LÚC ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} - ${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    document.getElementById("modal-content").textContent = `"${data.content}"`;

    // Media
    const mediaContainer = document.getElementById("modal-media-container");
    const mediaList = document.getElementById("modal-media-list");
    mediaList.innerHTML = "";
    if (data.reviewMedia && data.reviewMedia.length > 0) {
      mediaContainer.classList.remove("hidden");
      data.reviewMedia.forEach((media) => {
        mediaList.insertAdjacentHTML(
          "beforeend",
          `<img style="width:90px;height:90px;min-width:90px;border-radius:12px;object-fit:cover;border:1px solid #e5e7eb;" src="${media.url}" alt="Review">`
        );
      });
    } else {
      mediaContainer.classList.add("hidden");
    }

    // Reply Box state
    if (data.reply && data.reply.content) {
      replyInput.value = data.reply.content;
      replyInput.disabled = true;
    } else {
      replyInput.value = "";
      replyInput.disabled = false;
    }

    // Button states
    const btnApproveModal = document.getElementById("modal-btn-reply");
    const btnHideModal = document.getElementById("modal-btn-hide");
    
    btnApproveModal.style.display = "flex";
    btnHideModal.style.display = "flex";

    if (data.status === "APPROVED") {
      btnApproveModal.style.display = "none";
    } else if (data.status === "REJECTED") {
      btnHideModal.style.display = "none";
    }
  }
});
