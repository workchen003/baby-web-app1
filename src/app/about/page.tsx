// src/app/about/page.tsx

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-3xl p-8">
      <h1 className="text-4xl font-bold mb-6">關於我們</h1>
      <div className="prose lg:prose-xl">
        <p>
          Babix 的誕生源於一個簡單的信念：育兒的旅程雖然充滿挑戰，但每一個瞬間都無比珍貴。我們是一群身兼工程師、設計師與新手爸媽的團隊，深刻體會到在忙亂中記錄寶寶成長點滴、追蹤健康數據的困難。
        </p>
        <p>
          因此，我們致力於打造一款最直覺、最貼心的智慧育兒助理。我們希望透過簡潔的介面與強大的功能，將繁瑣的紀錄工作化繁為簡，讓您能更專注於與寶寶的互動和陪伴。從每一次餵奶、換尿布，到看著寶寶達成第一個發展里程碑，Babix 希望能成為您最可靠的夥伴，與您一同見證這些不可複製的奇蹟時刻。
        </p>
        <p>
          感謝您的信任與使用，讓我們一起輕鬆育兒，享受成長的每一個喜悅！
        </p>
      </div>
    </div>
  );
}