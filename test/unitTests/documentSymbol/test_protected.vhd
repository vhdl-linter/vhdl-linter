library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package pkg is
  type CrcCalculator is protected
    procedure Init;
    procedure Input(data: std_ulogic_vector);
    impure function GetCrc return std_ulogic_vector;
  end protected;
end package;

package body pkg is
  constant c_crcPol: std_ulogic_vector(31 downto 0) := x"04c11db7";

  function reflect(input: std_ulogic_vector) return std_ulogic_vector is
    variable result: std_ulogic_vector(input'range);
  begin
    for i in input'range loop
      result(i) := input(input'high - i);
    end loop;
    return result;
  end function;


  type CrcCalculator is protected body

    variable crc: std_ulogic_vector(31 downto 0) := (others => '1');

    procedure Init is
    begin
      crc := (others => '1');
    end procedure;

    procedure Input(data: std_ulogic_vector) is
    begin
      for i in data'length / 8 - 1 downto 0 loop
        for bit in 0 to 7 loop
          if crc(31) /= data(i * 8 + bit) then -- reflect input byte
            crc := (crc sll 1) xor c_crcPol;
          else
            crc := crc sll 1;
          end if;
        end loop;
      end loop;
    end procedure;
  
    impure function GetCrc return std_ulogic_vector is
      variable result: std_ulogic_vector(31 downto 0);
    begin
      result := crc xor x"ffffffff";
      return reflect(result);
    end function;

  end protected body;
end package body;