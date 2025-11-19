import Image from "next/image";
export default function Counter({time }: {time: number}) {
  return (
    <div className="">
        <Image src="/clock.png" alt="Logo" width={30} height={30} />
        <span className="ml-2">{time}h</span>
    </div>
  );
}