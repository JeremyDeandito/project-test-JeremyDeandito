class IdeasPage {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.sortBy = '-published_at';
        this.totalItems = 0;
        this.totalPages = 0;
        this.posts = [];
        this.isLoading = false;
        this.apiBaseUrl = 'https://suitmedia-backend.suitdev.com/api/ideas';
        
        this.init();
        this.setupEventListeners();
        this.loadUrlParams();
        this.loadPosts();
    }

    init() {
        this.headerEl = document.getElementById('header');
        this.bannerEl = document.getElementById('banner');
        this.bannerImageEl = document.getElementById('bannerImage');
        this.bannerContentEl = this.bannerEl.querySelector('.banner-content');
        this.showingInfoEl = document.getElementById('showingInfo');
        this.showPerPageEl = document.getElementById('showPerPage');
        this.sortByEl = document.getElementById('sortBy');
        this.postsGridEl = document.getElementById('postsGrid');
        this.loadingEl = document.getElementById('loading');
        this.paginationEl = document.getElementById('pagination');
        
        this.lastScrollY = window.scrollY;
    }

    setupEventListeners() {
        window.addEventListener('scroll', this.handleScroll.bind(this));
        this.showPerPageEl.addEventListener('change', this.handlePageSizeChange.bind(this));
        this.sortByEl.addEventListener('change', this.handleSortChange.bind(this));
        window.addEventListener('popstate', this.handlePopState.bind(this));
        this.navLinks = document.querySelectorAll('.nav-menu a');
        this.navLinks.forEach(link => {
            link.addEventListener('click', e => {
                this.navLinks.forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
    }

    handleScroll() {
        const currentScrollY = window.scrollY;
        if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
            this.headerEl.classList.add('hidden');
        } else {
            this.headerEl.classList.remove('hidden');
        }
        
        if (currentScrollY > 50) {
            this.headerEl.classList.add('transparent');
        } else {
            this.headerEl.classList.remove('transparent');
        }
        
        const imgSpeed = 0.3;
        if (this.bannerImageEl) {
            this.bannerImageEl.style.transform =
              `translateX(-50%) translateY(${currentScrollY * imgSpeed}px)`;
        }
        const txtSpeed = 0.5;
        if (this.bannerContentEl) {
            this.bannerContentEl.style.transform =
              `translateY(${currentScrollY * txtSpeed * -0.1}px)`;
        }
        this.lastScrollY = currentScrollY;
    }

    loadUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentPage = parseInt(urlParams.get('page')) || 1;
        this.pageSize = parseInt(urlParams.get('size')) || 10;
        this.sortBy = urlParams.get('sort') || '-published_at';
        
        this.showPerPageEl.value = this.pageSize;
        this.sortByEl.value = this.sortBy;
    }

    updateUrl() {
        const params = new URLSearchParams();
        params.set('page', this.currentPage);
        params.set('size', this.pageSize);
        params.set('sort', this.sortBy);
        
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
    }

    handlePopState() {
        this.loadUrlParams();
        this.loadPosts();
    }

    handlePageSizeChange() {
        this.pageSize = parseInt(this.showPerPageEl.value);
        this.currentPage = 1;
        this.updateUrl();
        this.loadPosts();
    }

    handleSortChange() {
        this.sortBy = this.sortByEl.value;
        this.currentPage = 1;
        this.updateUrl();
        this.loadPosts();
    }

    buildApiUrl() {
        const params = new URLSearchParams();
        params.set('page[number]', this.currentPage);
        params.set('page[size]', this.pageSize);
        params.append('append[]', 'small_image');
        params.append('append[]', 'medium_image');
        params.set('sort', this.sortBy);
        
        return `${this.apiBaseUrl}?${params.toString()}`;
    }

    async loadPosts() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.loadingEl.style.display = 'block';
        this.postsGridEl.style.opacity = '0.5';

        try {
            const apiUrl = this.buildApiUrl();
            console.log('Fetching:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            this.posts = data.data;
            this.totalItems = data.meta.total;
            this.totalPages = data.meta.last_page;
            
            this.renderPosts();
            this.renderPagination();
            this.updateShowingInfo();
            
        } catch (error) {
            console.error('Error loading posts:', error);
            this.renderError(error.message);
        } finally {
            this.isLoading = false;
            this.loadingEl.style.display = 'none';
            this.postsGridEl.style.opacity = '1';
        }
    }

    renderPosts() {
        this.postsGridEl.innerHTML = '';
        
        this.posts.forEach(post => {
            const imageUrl  = 'assets/placeholder.jpg';

            const postEl = document.createElement('div');
            postEl.className = 'post-card';
            postEl.innerHTML = `
                <img 
                    class="post-image loading"
                    src="${imageUrl}"
                    data-src="${imageUrl}" 
                    alt="${post.title}"
                >
                <div class="post-content">
                    <h3 class="post-title">${post.title}</h3>
                    <p class="post-date">${this.formatDate(post.published_at)}</p>
                </div>
            `;
            this.postsGridEl.appendChild(postEl);
        });
        
        this.setupLazyLoading();
    }

    setupLazyLoading() {
        const images = document.querySelectorAll('.post-image[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('loading');
                    img.onload = () => img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }

    renderPagination() {
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button 
                onclick="ideasPage.goToPage(${this.currentPage - 1})" 
                ${this.currentPage === 1 ? 'disabled' : ''}
            >
                ‹
            </button>
        `;
        
        // First page
        if (startPage > 1) {
            paginationHTML += `
                <button onclick="ideasPage.goToPage(1)">1</button>
            `;
            if (startPage > 2) {
                paginationHTML += '<span>...</span>';
            }
        }
        
        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button 
                    onclick="ideasPage.goToPage(${i})" 
                    ${i === this.currentPage ? 'class="active"' : ''}
                >
                    ${i}
                </button>
            `;
        }
        
        // Last page
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHTML += '<span>...</span>';
            }
            paginationHTML += `
                <button onclick="ideasPage.goToPage(${this.totalPages})">${this.totalPages}</button>
            `;
        }
        
        // Next button
        paginationHTML += `
            <button 
                onclick="ideasPage.goToPage(${this.currentPage + 1})" 
                ${this.currentPage === this.totalPages ? 'disabled' : ''}
            >
                ›
            </button>
        `;
        
        this.paginationEl.innerHTML = paginationHTML;
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        this.updateUrl();
        this.loadPosts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateShowingInfo() {
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.totalItems);
        this.showingInfoEl.textContent = `Showing ${start} - ${end} of ${this.totalItems}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    renderError(errorMessage = 'Unknown error occurred') {
        this.postsGridEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666;">
                <p>Sorry, we couldn't load the ideas. Please try again later.</p>
                <p style="font-size: 0.8em; color: #999; margin-top: 1rem;">Error: ${errorMessage}</p>
            </div>
        `;
    }
}

const ideasPage = new IdeasPage();
window.ideasPage = ideasPage;