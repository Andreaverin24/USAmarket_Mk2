import Link from 'next/link';

const pieces = [
  {
    name: 'Finn Juhl Chieftain Chair',
    price: '$28,500',
    detail: 'Niels Vodder',
    dealer: 'Gallery Dansk',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD9JtrIGh_1BW7N7fjiiIV3Oq7w0JHncRe9BkMr8zTrHA0_ISprxqXNfTXvX3xChQHin9XH1G90yKVjPuzM-pR42BXPuixnZ1DaCaqjP7DEqMMj1R9NvEzh8RrUXp6y_sCNp8WQUC0eY1DYpb2IZ2RdBkAZhyBDqBqIBRLYGbA7gyVARiYYdJ_w4qK_20EMHryHlV0z5IfL_w4P2_Bl_EOo7HrgYdCk-O3ty8-ds86i7L2rrL-wxPRt4Lt3usCdH9paJjkLNsrZllI',
  },
  {
    name: 'Angelo Mangiarotti Eros Table',
    price: '$14,200',
    detail: 'Skipper Møbler',
    dealer: 'Milano Modern',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBaplNPW41t9e0hHcQFrFQVvupIqEiamc2c25llEfhcWL6EoKceMjMdJyB75V4LB-sLvA_sQHwFMI2KGhuUf7T24Pse9xwYOGKAGsqDLoQsQ8la_XUATrxJKtSY4-hiJcgI6Vjd3Hcwfi4Cp9WvVLutqghQIXRUWusA-WTP1mlDBI_-sV6ZLPRl5Ysz6hCdfB8aL3xynRpm2KUtCxFttjFXth20T_Amu5KPJVp6ECO8P5ArGWgZydbKTv2lbmBHiGr6TFnIEET8Png',
  },
  {
    name: 'Barovier & Toso Chandelier',
    price: '$32,000',
    detail: 'Murano, 1960s',
    dealer: 'Luce Antica',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAi3uCIjia2lLUOelH9rCT8tMZN470NcHmrDsOY9eFcJp97Gdqldk5ft2onSn4gMGT-aEWkJXgtjrrCFq6nW9huTkNGr-2MQxooMl6V5fTh3liPlDURtL0u0CPc7hiuSMwuKitvXeJC9qt2M4tBWBxssXL5XjNXvZLVrDqcgMFjyDTdKeXtUyn7xE2lnMmSD6rXAii7ivrO3q9QtWJ4CkX4tD9QA62m2nuiPPkXJbSzWc4wXkHHqP8xAwsZu0vtcIL5MnjEpmNofNw',
  },
  {
    name: 'Alberto Burri Composition',
    price: 'Price on Request',
    detail: 'Italian, 1958',
    dealer: 'Studio Arte',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCmc9oVlmg71T_qQfyfEMoHqjnnlijfyfb_832ZaP5VSmAOlbyxEvopKN1EPRudAeZgf1E8eDCc76TFEnmyYp_q8iwsOr-hzuXcC26OxlwRPtqYmIFSMb25JO5y6rlBW_DYPmJkHr78CFexvjX3-t5PPe_AnnU7Uw3JzKtHqLg9MVhBl7A1n-OoyWM1xWG04Ha-6na_J42Bu1kGfG2IZqXN8V1XmlJ575qKWC22Yq0C59byNg22WufMJV3Y-ExUiNxUBOEZOCcazvs',
  },
  {
    name: 'Gino Sarfatti Floor Lamp',
    price: '$8,900',
    detail: 'Arteluce',
    dealer: 'Vanguard Gallery',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBdvBRl9fR_zqiLMsRJjGju1av962qVDFyx6gViIf_R3K9dPTEznW1azlrhuK2s3sceyYVefJMUsizDrz75AoECdTQpLnPBAt1O8dSE-EIKMlyDoXvV7bDkbHqFvzWVVykVh5YSPmfSozB7Vx3xs20bCw0WqnorUJIfxy8LyVxVUfw8T-wUGOCDjldjO31ZWNQARO9bk_0P8u_LbEZTqJ8zBxli_snAFDKkDSMQSRD7cPQ1hamnTSdPAJEt4RDIDfmBqZE1yMcM720',
  },
  {
    name: 'Hans Wegner Papa Bear',
    price: '$45,000',
    detail: 'A.P. Stolen',
    dealer: 'Nordic Design',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCrZ9M5edlK86Cug_9k2-qjR6TvjFpYHQlGsAV7abWRu0yBHjGJ2kL6DL9gjYMdgRPxyznUnhwUSP-sSaCcLgs4tlNVgPYbPM9KrVMuqxmEv_SHoiVHDx9fuRzXeKceuqMxZ4WMMVu12TdHrN3w8YJ8eBdUEksH7HUtAjCkEUTpmF4ySQzvvYPe6o-4GSUxj_0EGhEihaDAwLlF690bMP5OXn8ALKB5uUvlRIAfY8uXqPHanAUrSLTHKEf42MqWCSpUmjQAZTFIOwE',
  },
  {
    name: 'Axel Einar Hjorth Table',
    price: '$62,000',
    detail: 'NK, 1930s',
    dealer: 'Swedish Classic',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA5Bp85eSe-qB64NVFC_SkfGRaxGVPUjDX6XPNbUJ2m4VqrWGqrRrFTQuJ_6q4JC50qAY-coR3u8y71FZiTXGy9RBYwcTwhiz6EavBE_DgDGXCBP4qR80SysVfc9LUZZuXiqTQ-ijDHB8yEz7m6_c32B0___OaSG37ExKVeJ0WtKkGMVBD6oxKAkpzKJFctLhKMSsHhnEMMx64rj2V8mP3B3F6E8VCzz54j8VUf5NHHSnPWpRgiGHa9I9yZ_ZGk1GTKZMxrtcSJdVg',
  },
  {
    name: 'Marcel Breuer Wassily',
    price: '$5,500',
    detail: 'Gavina, 1960s',
    dealer: 'Forma Gallery',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDjhNaQq7njO3PQps8fJoE1OOUq3_wASYGvlwEIAtTu5rna8sW9nhqeDuZ8wivTgx-qv48TRJoPzyYPP-laa4iHa_je7nmalqo_Gc4G6dLQWwkq82IvQSCyhbDFxG2gjF_9g6utr-zqc2kzcviI8zdiHxQ96PTLYafCozC4x6WE36OqGvaQ5su6QEZDr2ZPsagDeMOXJUqlUrDhGHXd1YenyKSz5TiILxA8fZ_vqUezndYSRmVS4eByTCdOxo2S6-3dKbh0BbboExo',
  },
  {
    name: 'Renaissance Walnut Cabinet',
    price: '$18,000',
    detail: 'Italian, 17th C.',
    dealer: 'Antichità',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD4Unhtdh5CQltYYwoYqF8GQpBk3JktjzxzbkB_DMZHqX4Rvna4h7W--A8UPqT0lIk5YyBCXKQjl6diRIpA5swyoBwtYcV_Ep44w4dSSKt6cEzHumHopec_-KV7dKDFCxefYjpVj5tdjKcXG0f7rMFxFNcmMM7bkk-nuN8fEnwX5WDHD-GpZL9DHmh49fG7qCA4JwE4Pqq8ObOJzhSIRzIB24fwIb_T9wC8wnJTihzpzR-QoTQiedJ_8ATi2_TU38lhgxn2cFNs6Lo',
  },
  {
    name: 'Lucie Rie Ceramic Vessel',
    price: '$22,500',
    detail: 'London, 1970s',
    dealer: 'Modern Objects',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAKneFgf4aZe6iwldVcEvtZPdLPKzFO2TQv0aoMzQNNuokfWhqqUzfGl7jJ0zb-1Rg3KJP6p0ThkEAIgVqYI3_yddZZ6KMkWXvuYsEnE1amsdiPgQbY9BNnNV4MB9JHgyUe1uXo8v49DeDriJhlW3xXTH_hfXyFVYQHEwyiRwHZ1zuEEU2PHDwcBTbAd7raOHRd4kKld9VjcqYEAUPbMd9T40K8NA_luXP-nXG8P7CmHi9RHF8kWZ_cIZI0RACq4cymtCULsh9YYjo',
  },
];

const mosaicPieces = Array.from({ length: 30 }, (_, index) => ({
  ...pieces[index % pieces.length],
  image: `/demoImg/${(index % 20) + 1}.png`,
}));

const SearchIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export default function Page() {
  return (
    <main className="guild-home">
      <nav className="guild-nav" aria-label="Main navigation">
        <Link className="guild-wordmark" href="/">
          THE GUILD
        </Link>
        <div className="guild-navlinks">
          <Link className="active" href="/catalog">
            Explore
          </Link>
          <Link href="/catalog">Dealers</Link>
          <Link href="/catalog">Designers</Link>
          <Link href="/catalog">Sell on The Guild</Link>
        </div>
        <div className="guild-account">
          <Link className="guild-signin" href="/catalog">
            Sign In
          </Link>
          <Link className="guild-join" href="/catalog">
            Join The Guild
          </Link>
        </div>
      </nav>

      <header className="guild-hero">
        <div className="guild-mosaic">
          {mosaicPieces.map((piece, index) => (
            <Link
              aria-label={`${piece.name} — ${piece.price}`}
              className="guild-piece"
              href="/catalog"
              key={`${piece.name}-${index}`}
            >
              <img src={piece.image} alt={piece.name} />
              <div className="guild-piece-copy">
                <div>
                  <strong>{piece.name}</strong>
                  <span>{piece.price}</span>
                </div>
                <div>
                  <small>{piece.detail}</small>
                  <small>{piece.dealer}</small>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="guild-hero-wash">
          <div className="guild-gradient-footer">
            <p>© 2026 THE GUILD. All rights reserved. Crafted for the discerning collector.</p>
          </div>
        </div>
        <div className="guild-search-panel">
          <h1>Discover the extraordinary.</h1>
          <form className="guild-search" action="/catalog">
            <SearchIcon />
            <input
              aria-label="Search the collection"
              name="q"
              placeholder="What are you looking to source?"
              type="search"
            />
            <button type="submit">Explore</button>
          </form>
          <div className="guild-chips" aria-label="Popular filters">
            {['Dimensions', 'Color', 'Material', 'Dealer', 'Era', 'Designer'].map((filter) => (
              <Link href={`/catalog?filter=${filter.toLowerCase()}`} key={filter}>
                {filter}
              </Link>
            ))}
          </div>
        </div>
      </header>
    </main>
  );
}
