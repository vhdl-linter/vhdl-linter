library ieee;
  use IEEE.std_logic_1164.all ;

package test_attribute_reference is
end package;
package body test_attribute_reference is

  -- impure function GenRandSeed(S : string) return real is
  --   -----------------------------------------------------------------
  --   constant LEN      : integer := S'length;
  --   constant HALF_LEN : integer := LEN/2;
  --   alias revS        : string(LEN downto 1) is S;
  --   variable temp     : real    := 5381.0;
  -- begin
  --   for i in 1 to HALF_LEN loop
  --     temp := (temp*33.0 + real(character'pos(revS(i)))) mod (2.0**30);  -- The i needs to be read and not be part of the attribute reference
  --   end loop;
  --   return temp;
  -- end function GenRandSeed;

  -- ------------------------------------------------------------
  -- impure function DistBool return boolean is
  --   ------------------------------------------------------------
  --   variable FullWeight : integer_vector(0 to 1) := (others => 0);  -- vhdl-linter-disable-line unused
  -- begin
  --   for i in 5 loop
  --     FullWeight(boolean'pos(i)) := 5;
  --   end loop;
  --   return true;
  -- end function DistBool;

------------------------------------------------------------
  function FromMemoryBaseType_orig(Size : integer) return std_logic_vector is
    ------------------------------------------------------------
    variable Data : std_logic_vector(Size-1 downto 0);
  begin

    Data := (Data'range => 'X');

    return Data;
  end function FromMemoryBaseType_orig;
end package body;
