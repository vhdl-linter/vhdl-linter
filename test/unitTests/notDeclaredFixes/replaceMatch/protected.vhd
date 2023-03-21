entity foo is
end entity;
architecture arch of foo is
  type prot is protected
    procedure apple(i: integer);
    function banana return integer;
  end protected;
  signal test: prot; -- vhdl-linter-disable-line unused
begin
  test.appl(tes.banana);
end arch;
