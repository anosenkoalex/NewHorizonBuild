import styles from './Viewer.module.css';

const Viewer = () => {
  return (
    <div className={styles.viewerPage}>
      <h1 className={styles.pageTitle}>3D модели объектов (заглушка)</h1>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Объекты / этажи / квартиры (заглушка)</h2>
          <ul className={styles.placeholderList}>
            <li>Проект A</li>
            <li>Корпус 1</li>
            <li>Этаж 5</li>
            <li>Квартира 51</li>
            <li>Позиция 1</li>
            <li>Позиция 2</li>
            <li>Позиция 3</li>
          </ul>
        </aside>

        <section className={styles.viewerArea}>
          <div className={styles.viewerPlaceholder}>
            <p>3D Viewer (здесь будет интеграция 3D-моделей)</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Viewer;
