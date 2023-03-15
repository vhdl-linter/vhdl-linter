entity test_deref is
end entity;
architecture arch of test_deref is
begin
  t_label : process is

    type rec;
    type recptr is access rec;
    type rec is
    record
      value : integer;
    end record;
    variable list2  : recptr; -- vhdl-linter-disable-line unused
    variable recobj : rec; -- vhdl-linter-disable-line unused
  begin
    recobj := list2.all;  -- An explicit dereference is needed here.
  end process;
end architecture;
